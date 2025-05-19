from sqlalchemy import Table, Column, Integer, String, JSON, MetaData
from core.database import metadata

GridTemplate = Table(
    "grid_template",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("grid_structure", JSON),
    Column("solution_grid", JSON),
    Column("placed_words", JSON),
    Column("definitions_horizontal", JSON),
    Column("definitions_vertical", JSON),
    Column("grid_def_order", JSON),
    Column("difficulty", String),
)