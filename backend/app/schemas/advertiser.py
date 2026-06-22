import uuid

from pydantic import BaseModel, EmailStr


class AdvertiserBase(BaseModel):
    email: EmailStr
    name: str | None = None


class AdvertiserCreate(AdvertiserBase):
    pass


class AdvertiserResponse(AdvertiserBase):
    id: uuid.UUID
    created_at: str

    model_config = {"from_attributes": True}
