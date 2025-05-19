from sqlalchemy import create_engine, MetaData
from databases import Database

DATABASE_URL = "postgresql://crossword:crossword@crossword-db:5432/crossword"

database = Database(DATABASE_URL)
metadata = MetaData()