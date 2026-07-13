import tempfile
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from pipeline import process_document_background, validate_service_token

app = FastAPI(title="SREP Document Processor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "srep-document-processor"}


@app.post("/process-pdf")
async def process_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    x_service_token: str = Header(default="", alias="X-Service-Token"),
    x_job_id: str = Header(default="", alias="X-Job-Id"),
    x_document_id: str = Header(default="", alias="X-Document-Id"),
    x_user_id: str = Header(default="", alias="X-User-Id"),
    x_file_hash: str = Header(default="", alias="X-File-Hash"),
    x_source_type: str = Header(default="pdf", alias="X-Source-Type"),
    x_document_type: str = Header(default="study-material", alias="X-Document-Type"),
    x_page_count: str = Header(default="", alias="X-Page-Count"),
):
    if not validate_service_token(x_service_token):
        raise HTTPException(status_code=401, detail="Invalid service token")

    if not x_job_id or not x_document_id or not x_user_id or not x_file_hash:
        raise HTTPException(status_code=400, detail="Missing required headers")

    suffix = Path(file.filename or "document.pdf").suffix or ".pdf"
    temp_dir = Path(tempfile.mkdtemp(prefix="srep-upload-"))
    temp_path = temp_dir / f"source{suffix}"
    temp_path.write_bytes(await file.read())

    background_tasks.add_task(
        process_document_background,
        temp_path=str(temp_path),
        original_file_name=file.filename or "document.pdf",
        job_id=x_job_id,
        document_id=x_document_id,
        user_id=x_user_id,
        file_hash=x_file_hash,
        source_type=x_source_type,
        document_type=x_document_type,
        requested_page_count=x_page_count,
    )

    return {
        "jobId": x_job_id,
        "documentId": x_document_id,
        "status": "processing",
        "message": "Document queued for structured extraction",
    }
