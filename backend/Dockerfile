FROM python:3.11-slim

WORKDIR /app

RUN pip install poetry

COPY pyproject.toml poetry.lock ./

RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi

COPY src ./src
COPY game_data.json ./

EXPOSE 8000

CMD ["poetry", "run", "start"]

