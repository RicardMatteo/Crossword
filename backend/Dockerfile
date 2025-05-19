FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN pip install poetry --no-cache-dir

WORKDIR /app

COPY pyproject.toml poetry.lock ./

RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi

COPY src ./src
COPY game_data.json ./

EXPOSE 8021

ENV PYTHONPATH=/app/src
CMD ["poetry", "run", "start"]