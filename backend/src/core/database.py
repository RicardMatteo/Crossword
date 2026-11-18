from sqlalchemy import create_engine, MetaData
from databases import Database
import os

# Allow overriding the DB URL via environment (useful for docker-compose or tests).
# Fallback to the previous hard-coded value if not provided.
DATABASE_URL = os.getenv(
	"DATABASE_URL",
	"postgresql://crossword:crossword@crossword-db:5432/crossword",
)

database = Database(DATABASE_URL)
metadata = MetaData()