from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.models import Base, Department
import enum


class DepartmentEnum(str, enum.Enum):
    MARKETING = "marketing"
    CARGO = "cargo"
    FIDELIDADE = "fidelidade"
    VIAGENS = "viagens"
    CARGO_EXPRESS = "cargo_express"
    TECNOLOGIA = "tecnologia"
    FINANCEIRO = "financeiro"
    OPERACOES = "operacoes"
    OUTROS = "outros"


engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    # Drop all tables with CASCADE to handle foreign keys
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
        conn.commit()
    
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        for dept in DepartmentEnum:
            existing = db.query(Department).filter(Department.name == dept).first()
            if not existing:
                db.add(Department(
                    name=dept,
                    display_name=dept.value.replace("_", " ").title(),
                    color="#6366f1"
                ))
        db.commit()
        print("Database initialized successfully")
    except Exception as e:
        db.rollback()
        print(f"Error initializing database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_db()