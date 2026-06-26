"""Thin entrypoint for the backend application."""

from app.controller.api import app


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8009)
