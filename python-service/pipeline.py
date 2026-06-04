import json
import os
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from docx import Document as DocxDocument
from fastapi import HTTPException
from pymongo import MongoClient
from pypdf import PdfReader

try:
    import opendataloader_pdf
except Exception:  # pragma: no cover
    opendataloader_pdf = None


MONGODB_URI = os.getenv("MONGODB_URI", "")
PROCESSOR_TOKEN = os.getenv("PDF_PROCESSOR_TOKEN", "")
DATABASE_NAME = os.getenv("MONGODB_DATABASE", "srep_studymate")
MAX_PAGES = int(os.getenv("PDF_PROCESSOR_MAX_PAGES", "100"))

client = MongoClient(MONGODB_URI) if MONGODB_URI else None
db = client[DATABASE_NAME] if client else None


def validate_service_token(token: str) -> bool:
    return bool(PROCESSOR_TOKEN) and token == PROCESSOR_TOKEN


def _documents_collection():
    if db is None:
        raise HTTPException(status_code=500, detail="MongoDB is not configured")
    return db["documents"]


def _jobs_collection():
    if db is None:
        raise HTTPException(status_code=500, detail="MongoDB is not configured")
    return db["jobs"]


def _pdf_page_count(pdf_path: Path) -> int:
    reader = PdfReader(str(pdf_path))
    return len(reader.pages)


def _sample_pdf_text(pdf_path: Path, sample_pages: int = 3) -> str:
    reader = PdfReader(str(pdf_path))
    collected: list[str] = []
    for page in reader.pages[:sample_pages]:
        try:
            collected.append(page.extract_text() or "")
        except Exception:
            collected.append("")
    return "\n".join(collected).strip()


def _is_scanned_pdf(pdf_path: Path) -> bool:
    sample_text = _sample_pdf_text(pdf_path)
    return len(sample_text.strip()) < 120


def _ocr_pdf(input_pdf: Path, output_dir: Path) -> Path:
    output_pdf = output_dir / "ocr-output.pdf"
    command = [
        "ocrmypdf",
        "--skip-text",
        "--deskew",
        "--clean",
        "--optimize",
        "0",
        str(input_pdf),
        str(output_pdf),
    ]
    subprocess.run(command, check=True, capture_output=True, text=True)
    return output_pdf


def _convert_with_opendataloader(input_path: Path, output_dir: Path) -> None:
    if opendataloader_pdf is None:
        raise RuntimeError("opendataloader_pdf is not installed")

    opendataloader_pdf.convert(
        input_path=[str(input_path)],
        output_dir=str(output_dir),
        format="markdown,json",
    )


def _find_output_file(output_dir: Path, suffix: str) -> Path | None:
    candidates = sorted(output_dir.rglob(f"*{suffix}"))
    return candidates[0] if candidates else None


def _normalize_content_lines(content: Any) -> list[str]:
    if isinstance(content, list):
        return [str(item).strip() for item in content if str(item).strip()]
    if content is None:
        return []
    text = str(content).strip()
    if not text:
        return []
    return [line.strip() for line in re.split(r"\n+", text) if line.strip()]


def _parse_open_data_loader_json(json_path: Path, fallback_title: str) -> dict[str, Any]:
    data = json.loads(json_path.read_text(encoding="utf-8"))

    if isinstance(data, dict) and data.get("pages"):
        pages = []
        for index, page in enumerate(data.get("pages", []), start=1):
            page_number = int(page.get("pageNumber") or page.get("page_number") or index)
            sections = []
            for section in page.get("sections", []):
                sections.append(
                    {
                        "heading": str(section.get("heading") or section.get("title") or f"Section {len(sections) + 1}"),
                        "content": _normalize_content_lines(section.get("content") or section.get("text") or section.get("body")),
                    }
                )
            if not sections:
                sections.append(
                    {
                        "heading": f"Page {page_number}",
                        "content": _normalize_content_lines(page.get("content") or page.get("text") or page.get("body")),
                    }
                )
            pages.append({"pageNumber": page_number, "sections": sections})
        return {"title": data.get("title") or fallback_title, "pages": pages}

    if isinstance(data, list):
        pages = []
        for index, item in enumerate(data, start=1):
            pages.append(
                {
                    "pageNumber": int(item.get("pageNumber") or item.get("page_number") or index),
                    "sections": [
                        {
                            "heading": str(item.get("heading") or item.get("title") or f"Section {index}"),
                            "content": _normalize_content_lines(item.get("content") or item.get("text") or item.get("body")),
                        }
                    ],
                }
            )
        return {"title": fallback_title, "pages": pages}

    return {"title": fallback_title, "pages": []}


def _parse_markdown(markdown_path: Path, fallback_title: str) -> dict[str, Any]:
    markdown = markdown_path.read_text(encoding="utf-8")
    parts = re.split(r"^#{1,6}\s+", markdown, flags=re.MULTILINE)
    pages = []
    if len(parts) > 1:
        for index, section in enumerate(parts[1:], start=1):
            heading_match = re.match(r"([^\n]+)", section)
            heading = heading_match.group(1).strip() if heading_match else f"Section {index}"
            body = section[len(heading):].strip() if heading_match else section.strip()
            pages.append(
                {
                    "pageNumber": index,
                    "sections": [{"heading": heading, "content": _normalize_content_lines(body)}],
                }
            )
    if not pages:
        pages.append(
            {
                "pageNumber": 1,
                "sections": [{"heading": "Section 1", "content": _normalize_content_lines(markdown)}],
            }
        )
    return {"title": fallback_title, "pages": pages}


def _chunk_pages(pages: list[dict[str, Any]], target_words: int = 400, min_words: int = 300, max_words: int = 500) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    for page in pages:
        page_number = int(page.get("pageNumber") or 1)
        content_lines = []
        for section in page.get("sections", []):
            content_lines.extend(_normalize_content_lines(section.get("content")))
        content = "\n\n".join(content_lines).strip()
        if not content:
            content = f"Page {page_number}"
        first_section = page.get("sections", [{}])[0] if page.get("sections") else {}
        heading = str(first_section.get("heading") or f"Page {page_number}")
        chunks.append({
            "chunkId": f"page-{page_number}",
            "pageNumber": page_number,
            "pageNumbers": [page_number],
            "heading": heading,
            "content": content,
            "wordCount": len(re.findall(r"\S+", content)),
        })
    return chunks



def _persist_results(job_id: str, document_id: str, user_id: str, result: dict[str, Any], warnings: list[str]) -> None:
    documents = _documents_collection()
    jobs = _jobs_collection()

    extracted_text = "\n\n".join(chunk["content"] for chunk in result["chunks"])
    confidence = 1.0 if not warnings else 0.6

    documents.update_one(
        {"_id": document_id, "userId": user_id},
        {
            "$set": {
                "title": result["title"],
                "pages": result["pages"],
                "chunks": result["chunks"],
                "metadata": {
                    **result["metadata"],
                    "warnings": warnings,
                    "confidence": confidence,
                    "processedAt": datetime.now(timezone.utc),
                },
                "extractedText": extracted_text,
                "processingStatus": "completed",
                "processingError": None,
                "jobId": job_id,
            }
        },
    )

    jobs.update_one(
        {"jobId": job_id, "userId": user_id},
        {"$set": {"status": "done", "progress": 100, "stage": "completed", "resultId": document_id, "error": None, "completedAt": datetime.now(timezone.utc)}},
    )


def _fail_results(job_id: str, document_id: str, user_id: str, message: str) -> None:
    documents = _documents_collection()
    jobs = _jobs_collection()

    documents.update_one(
        {"_id": document_id, "userId": user_id},
        {"$set": {"processingStatus": "failed", "processingError": message, "jobId": job_id}},
    )
    jobs.update_one(
        {"jobId": job_id, "userId": user_id},
        {"$set": {"status": "failed", "error": message, "stage": "failed", "completedAt": datetime.now(timezone.utc)}},
    )


def _process_pdf_file(pdf_path: Path, title: str) -> tuple[dict[str, Any], list[str]]:
    warnings: list[str] = []
    page_count = _pdf_page_count(pdf_path)
    if page_count > MAX_PAGES:
        raise HTTPException(status_code=400, detail=f"PDF exceeds maximum page limit of {MAX_PAGES}")

    scanned = _is_scanned_pdf(pdf_path)
    working_path = pdf_path
    extraction_mode = "digital-open-data-loader"

    with tempfile.TemporaryDirectory(prefix="srep-processor-out-") as output_dir_name:
        output_dir = Path(output_dir_name)
        if scanned:
            warnings.append("Scanned PDF detected; OCRmyPDF fallback applied")
            extraction_mode = "ocrmypdf-open-data-loader"
            try:
                working_path = _ocr_pdf(pdf_path, output_dir)
            except Exception as error:
                warnings.append(f"OCR fallback failed: {error}")
                working_path = pdf_path

        _convert_with_opendataloader(working_path, output_dir)

        json_file = _find_output_file(output_dir, ".json")
        markdown_file = _find_output_file(output_dir, ".md")

        if json_file:
            parsed = _parse_open_data_loader_json(json_file, title)
        elif markdown_file:
            parsed = _parse_markdown(markdown_file, title)
        else:
            raise RuntimeError("OpenDataLoader did not produce markdown or JSON output")

    pages = parsed.get("pages", [])
    chunks = _chunk_pages(pages)

    return (
        {
            "title": parsed.get("title") or title,
            "pages": pages,
            "chunks": chunks,
            "metadata": {
                "pages": page_count,
                "language": "en",
                "extractionMode": extraction_mode,
                "scanned": scanned,
            },
        },
        warnings,
    )


def _process_docx_file(docx_path: Path, title: str) -> tuple[dict[str, Any], list[str]]:
    document = DocxDocument(str(docx_path))
    paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]
    structured_pages = [
        {
            "pageNumber": 1,
            "sections": [{"heading": "Document", "content": paragraphs or [title]}],
        }
    ]
    chunks = _chunk_pages(structured_pages)
    return (
        {
            "title": title,
            "pages": structured_pages,
            "chunks": chunks,
            "metadata": {
                "pages": 1,
                "language": "en",
                "extractionMode": "python-docx",
                "scanned": False,
            },
        },
        [],
    )


def _process_txt_file(txt_path: Path, title: str) -> tuple[dict[str, Any], list[str]]:
    text = txt_path.read_text(encoding="utf-8", errors="ignore")
    structured_pages = [
        {
            "pageNumber": 1,
            "sections": [{"heading": "Text", "content": _normalize_content_lines(text) or [text]}],
        }
    ]
    chunks = _chunk_pages(structured_pages)
    return (
        {
            "title": title,
            "pages": structured_pages,
            "chunks": chunks,
            "metadata": {
                "pages": 1,
                "language": "en",
                "extractionMode": "plain-text",
                "scanned": False,
            },
        },
        [],
    )


def process_document_background(
    temp_path: str,
    original_file_name: str,
    job_id: str,
    document_id: str,
    user_id: str,
    file_hash: str,
    source_type: str,
    document_type: str,
    requested_page_count: str = "",
) -> None:
    pdf_path = Path(temp_path)
    title = Path(original_file_name).stem

    try:
        if source_type == "pdf" or pdf_path.suffix.lower() == ".pdf":
            if requested_page_count and int(requested_page_count) > MAX_PAGES:
                raise HTTPException(status_code=400, detail=f"PDF exceeds maximum page limit of {MAX_PAGES}")
            result, warnings = _process_pdf_file(pdf_path, title)
        elif source_type in {"docx", "doc"} or pdf_path.suffix.lower() in {".docx", ".doc"}:
            result, warnings = _process_docx_file(pdf_path, title)
        else:
            result, warnings = _process_txt_file(pdf_path, title)

        result["metadata"]["warnings"] = warnings
        _persist_results(job_id, document_id, user_id, result, warnings)
    except Exception as error:
        _fail_results(job_id, document_id, user_id, str(error))
    finally:
        try:
            temp_parent = pdf_path.parent
            if temp_parent.exists() and temp_parent.name.startswith("srep-upload-"):
                shutil.rmtree(temp_parent, ignore_errors=True)
        except Exception:
            pass
