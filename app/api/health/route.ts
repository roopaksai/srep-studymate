/**
 * Health Check API Endpoint
 * Checks the status of critical services
 */

import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import { config } from "@/lib/config"

export async function GET() {
  const startTime = Date.now()
  const health: any = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: config.app.version,
    environment: config.app.environment,
    checks: {},
  }

  try {
    // Check MongoDB connection
    try {
      await connectDB()
      const mongoose = await import("mongoose")
      health.checks.database = {
        status: mongoose.default.connection.readyState === 1 ? "healthy" : "unhealthy",
        connected: mongoose.default.connection.readyState === 1,
        responseTime: Date.now() - startTime,
      }
    } catch (error) {
      health.checks.database = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      }
      health.status = "degraded"
    }

    // Check AI API availability
    try {
      if (config.ai.apiKey) {
        const aiCheckStart = Date.now()
        const response = await fetch("https://openrouter.ai/api/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.ai.apiKey}`,
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })
        
        health.checks.aiService = {
          status: response.ok ? "healthy" : "unhealthy",
          responseTime: Date.now() - aiCheckStart,
          statusCode: response.status,
        }

        if (!response.ok) {
          health.status = "degraded"
        }
      } else {
        health.checks.aiService = {
          status: "unconfigured",
          message: "AI API key not configured",
        }
      }
    } catch (error) {
      health.checks.aiService = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      }
      health.status = "degraded"
    }

    // Overall response time
    health.responseTime = Date.now() - startTime

    // Set appropriate status code
    const statusCode = health.status === "healthy" ? 200 : 503

    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    )
  }
}
