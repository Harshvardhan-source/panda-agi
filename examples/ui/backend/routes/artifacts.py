"""
Artifacts routes for the PandaAGI SDK.
"""

from io import BytesIO
import aiohttp
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import Response
from pydantic import BaseModel
import os
import logging
import traceback
import mimetypes
from typing import Optional

from services.artifacts import ArtifactsService
from utils.markdown_utils import process_markdown_to_pdf
from utils.html_utils import generate_error_page_html, should_return_html
from models.agent import (
    ArtifactResponse,
    ArtifactsListResponse,
    ArtifactNameUpdateRequest,
)

logger = logging.getLogger(__name__)

PANDA_AGI_SERVER_URL = (
    os.environ.get("PANDA_AGI_BASE_URL") or "https://agi-api.pandas-ai.com"
)

PANDA_CHAT_CLIENT_URL = (
    os.environ.get("PANDA_CHAT_CLIENT_URL") or "https://chat.pandas-ai.com"
)

# Create router
router = APIRouter(prefix="/artifacts", tags=["artifacts"])


async def process_artifact_markdown_to_pdf(
    file_path: str,
    content_bytes: bytes,
    artifact_id: str,
    session: aiohttp.ClientSession,
    headers: Optional[dict],
    is_public: bool = False,
    base_source_url: str = None,
) -> Optional[Response]:
    """
    Process a markdown file from artifacts and return it as a PDF response.

    Args:
        file_path: Path to the markdown file
        content_bytes: The markdown content as bytes
        artifact_id: The artifact ID
        session: The aiohttp session for making requests
        headers: Headers to use for requests
        is_public: Whether this is a public artifact (affects base URL)

    Returns:
        Response: PDF response if conversion successful, None if should fall back
    """
    logger.debug(f"Converting markdown file to PDF: {file_path}")

    # Define async function to fetch files
    async def fetch_file(url: str, headers: dict) -> bytes:
        async with session.get(url, headers=headers) as resp:
            if resp.status == 200:
                return await resp.read()
            else:
                raise Exception(f"Failed to fetch file from {url}: {resp.status}")

    # Decode markdown content
    markdown_content = content_bytes.decode("utf-8")

    # Get the base URL for resolving relative image paths
    if is_public:
        base_url = f"{PANDA_AGI_SERVER_URL}/artifacts/public/{artifact_id}/"
    else:
        base_url = f"{PANDA_AGI_SERVER_URL}/artifacts/{artifact_id}/"

    # Use the utility function to convert markdown to PDF
    result = await process_markdown_to_pdf(
        markdown_content=markdown_content,
        file_path=file_path,
        base_url=base_url,
        get_file_func=fetch_file,
        headers=headers,
        base_source_url=base_source_url,
    )

    if result:
        pdf_bytes, pdf_filename = result
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={pdf_filename}"},
        )
    else:
        # Fall back to regular markdown response if conversion fails
        logger.debug("PDF conversion failed, falling back to markdown response")
        return None


# Security scheme for bearer token


class ArtifactPayload(BaseModel):
    type: str
    name: str
    filepath: str


class ArtifactUpdateRequest(BaseModel):
    """Request model for updating artifact name and public status."""

    name: Optional[str] = None
    is_public: Optional[bool] = None


async def cleanup_artifact(artifact_id: str, api_key: str):
    """
    Clean up an artifact by calling the delete endpoint.

    Args:
        artifact_id: The ID of the artifact to delete
        api_key: The API key for authentication
    """
    try:
        logger.info(f"Cleaning up artifact {artifact_id} due to upload failure")
        async with aiohttp.ClientSession() as session:
            headers = {"X-API-KEY": f"{api_key}"}
            async with session.delete(
                f"{PANDA_AGI_SERVER_URL}/artifacts/{artifact_id}", headers=headers
            ) as cleanup_resp:
                if cleanup_resp.status != 200:
                    logger.error(
                        f"Failed to cleanup creation {artifact_id}: {cleanup_resp.status}"
                    )
                else:
                    logger.info(f"Successfully cleaned up creation {artifact_id}")
    except Exception as cleanup_error:
        logger.error(f"Error during creation cleanup: {cleanup_error}")


async def upload_file_to_gcs(
    presigned_post: dict,
    file_bytes: bytes,
    prefix: str,
    relative_path: str = None,
):
    """Upload a file to GCS.

    Args:
        presigned_post (dict): GCP bucket presigned credentials
        file_bytes (bytes): file content in bytes
        prefix (str): Artifact ID to upload to
        relative_path (str, optional): relative path of file Defaults to None.
    """
    upload_url = presigned_post["url"]
    fields = presigned_post["fields"].copy()

    filename = f"{prefix}/{(relative_path or 'file').lstrip('/')}"
    # This is required for `starts-with` policies.
    fields["key"] = filename

    file_obj = BytesIO(file_bytes)

    try:

        async with aiohttp.ClientSession() as session:
            data = aiohttp.FormData()

            for key, value in fields.items():
                data.add_field(key, value)

            data.add_field("file", file_obj)

            async with session.post(upload_url, data=data) as resp:
                if not resp.status in (200, 201, 204):
                    body = await resp.text()
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to upload file to GCS: {resp.status} {body}",
                    )

                logger.info(
                    f"Successfully uploaded {filename} with status {resp.status}"
                )
                return resp

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.post("/{conversation_id}/save")
async def save_artifact(
    request: Request, conversation_id: str, payload: ArtifactPayload
):
    """Save artifacts to the database"""

    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    if not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    artifact_id = None
    try:
        async with aiohttp.ClientSession() as session:
            payload_dict = payload.dict()
            payload_dict["conversation_id"] = conversation_id
            payload_dict["filepath"] = ArtifactsService.get_relative_filepath(
                payload.type, payload.filepath
            )
            headers = {"X-API-KEY": f"{api_key}"}
            async with session.post(
                f"{PANDA_AGI_SERVER_URL}/artifacts/", json=payload_dict, headers=headers
            ) as resp:
                response = await resp.json()

                if resp.status != 200:
                    logger.error(f"Error saving creations: {response}")
                    message = (
                        "Unknown error"
                        if "detail" not in response
                        else response["detail"]
                    )

                    raise HTTPException(
                        status_code=resp.status,
                        detail=response.get(
                            "message",
                            message,
                        ),
                    )

                # Store the artifact ID for potential cleanup
                artifact = response.get("artifact")
                artifact_id = artifact.get("id")

        files_generator = ArtifactsService.get_files_for_artifact(
            payload.type, payload.filepath, conversation_id, artifact_id
        )

        async for file_bytes, relative_path in files_generator:
            await upload_file_to_gcs(
                response["upload_credentials"], file_bytes, artifact_id, relative_path
            )

        return {"detail": "Creations saved successfully", "artifact": artifact}
    except HTTPException as e:
        raise e
    except ValueError as e:
        # Clean up artifact if it was created before ValueError occurred
        if artifact_id:
            await cleanup_artifact(artifact_id, api_key)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error saving creations: {traceback.format_exc()}")

        # If artifact was created but upload failed, clean it up
        if artifact_id:
            await cleanup_artifact(artifact_id, api_key)

        raise HTTPException(status_code=500, detail="internal server error")


@router.get("/", response_model=ArtifactsListResponse)
async def get_user_artifacts(
    request: Request,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """Get creations for a conversation"""

    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    if not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        async with aiohttp.ClientSession() as session:
            headers = {"X-API-KEY": f"{api_key}"}
            params = {"limit": limit, "offset": offset}
            async with session.get(
                f"{PANDA_AGI_SERVER_URL}/artifacts/", headers=headers, params=params
            ) as resp:
                response = await resp.json()

                if resp.status != 200:
                    logger.error(f"Error getting creations: {response}")
                    message = (
                        "Unknown error"
                        if "detail" not in response
                        else response["detail"]
                    )

                    raise HTTPException(
                        status_code=resp.status,
                        detail=response.get(
                            "message",
                            message,
                        ),
                    )

                return response

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting creations: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="internal server error")


@router.get("/serve/{artifact_id}/{file_path:path}")
async def serve_artifact_file(
    request: Request,
    artifact_id: str,
    file_path: str,
    raw: bool = Query(False, alias="raw"),
):
    """Get artifact file content - handles both authenticated and public access"""
    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    # Determine if this is a public or private artifact based on API key presence
    is_public = api_key is None

    # Get base artifact URL for setting the path in the markdown HTML response
    base_source_url = f"{PANDA_CHAT_CLIENT_URL}/creations/{artifact_id}"

    try:
        async with aiohttp.ClientSession() as session:
            # Set up headers - only include API key if available
            headers = {}
            if api_key:
                headers["X-API-KEY"] = f"{api_key}"

            url = f"{PANDA_AGI_SERVER_URL}/artifacts/serve/{artifact_id}/{file_path}"

            async with session.get(url, headers=headers) as resp:
                if resp.status != 200:
                    logger.error(f"Error getting creation file: {resp.status}")
                    response = await resp.json()
                    error_detail = (
                        response["detail"]
                        if "detail" in response
                        else f"HTTP {resp.status}"
                    )

                    # Check if client accepts HTML
                    if should_return_html(request.headers.get("accept")):
                        html_content = generate_error_page_html(
                            resp.status, error_detail
                        )
                        return Response(
                            content=html_content,
                            media_type="text/html",
                            status_code=resp.status,
                        )

                    raise HTTPException(
                        status_code=resp.status,
                        detail=error_detail,
                    )

                # Get content as bytes
                content_bytes = await resp.read()

                # Check if it's a markdown file and raw mode is not requested
                if file_path.lower().endswith((".md", ".markdown")) and not raw:
                    pdf_response = await process_artifact_markdown_to_pdf(
                        file_path,
                        content_bytes,
                        artifact_id,
                        session,
                        headers,
                        is_public=is_public,
                        base_source_url=base_source_url,
                    )
                    if pdf_response:
                        return pdf_response

                # Determine MIME type for non-markdown files
                mime_type, _ = mimetypes.guess_type(file_path)
                if not mime_type:
                    mime_type = "application/octet-stream"

                return Response(content=content_bytes, media_type=mime_type)

    except HTTPException as e:
        raise e
    except aiohttp.ClientConnectorError as e:
        logger.error(f"Backend server is not responding at {PANDA_AGI_SERVER_URL}: {e}")
        if should_return_html(request.headers.get("accept")):
            html_content = generate_error_page_html(
                503,
                f"Service unavailable. Please try again later.",
            )
            return Response(
                content=html_content, media_type="text/html", status_code=503
            )
        raise HTTPException(
            status_code=503,
            detail=f"Service unavailable. Please try again later.",
        )
    except Exception as e:
        logger.error(f"Error getting creation file: {traceback.format_exc()}")
        # Check if client accepts HTML
        if should_return_html(request.headers.get("accept")):
            html_content = generate_error_page_html(
                500,
                "We're experiencing technical difficulties. Please try again later.",
            )
            return Response(
                content=html_content, media_type="text/html", status_code=500
            )
        raise HTTPException(status_code=500, detail="internal server error")


@router.delete("/{artifact_id}")
async def delete_artifact(request: Request, artifact_id: str):
    """Delete an artifact by ID"""

    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    if not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        async with aiohttp.ClientSession() as session:
            headers = {"X-API-KEY": f"{api_key}"}
            async with session.delete(
                f"{PANDA_AGI_SERVER_URL}/artifacts/{artifact_id}", headers=headers
            ) as resp:
                if resp.status != 200:
                    response = await resp.json()
                    logger.error(
                        f"Error deleting artifact: {resp.status} {response.get('detail', 'Unknown error')}"
                    )
                    raise HTTPException(
                        status_code=resp.status,
                        detail="Failed to delete creation",
                    )

                return {"detail": "Creation deleted successfully"}

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error deleting creation: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="internal server error")


@router.patch("/{artifact_id}", response_model=ArtifactResponse)
async def update_artifact(
    request: Request, artifact_id: str, update_data: ArtifactUpdateRequest
) -> ArtifactResponse:
    """Update an artifact name and/or public status"""

    # Get API key from request state (set by AuthMiddleware)
    api_key = getattr(request.state, "api_key", None)

    if not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        async with aiohttp.ClientSession() as session:
            headers = {"X-API-KEY": f"{api_key}"}
            async with session.patch(
                f"{PANDA_AGI_SERVER_URL}/artifacts/{artifact_id}",
                json=update_data.dict(exclude_none=True),
                headers=headers,
            ) as resp:
                if resp.status != 200:
                    response = await resp.json()
                    logger.error(
                        f"Error updating creation: {resp.status} {response.get('detail', 'Unknown error')}"
                    )
                    raise HTTPException(
                        status_code=resp.status,
                        detail=f"Failed to update creation",
                    )

                return await resp.json()

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating creation: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="internal server error")
