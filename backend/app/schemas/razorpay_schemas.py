from pydantic import BaseModel, field_validator


class RazorpayOrderRequest(BaseModel):
    """Frontend → backend: request a Razorpay order for a campaign."""
    campaign_id: str


class RazorpayOrderResponse(BaseModel):
    """Backend → frontend: Razorpay order details to open checkout."""
    order_id: str
    amount_paise: int
    currency: str = "INR"
    key_id: str


class RazorpayVerifyPaymentRequest(BaseModel):
    """Frontend → backend: verify payment after Razorpay checkout success callback."""
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    campaign_id: str


class RazorpayVerifyPaymentResponse(BaseModel):
    status: str  # "activated" | "already_active"
    campaign_id: str


class RazorpayBankOnboardRequest(BaseModel):
    """Developer adds Indian bank account for payouts."""
    account_number: str
    ifsc: str
    account_holder_name: str

    @field_validator("ifsc")
    @classmethod
    def validate_ifsc(cls, v: str) -> str:
        v = v.upper().strip()
        if len(v) != 11:
            raise ValueError("IFSC code must be exactly 11 characters")
        return v

    @field_validator("account_number")
    @classmethod
    def validate_account_number(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or not (9 <= len(v) <= 18):
            raise ValueError("Account number must be 9-18 digits")
        return v


class RazorpayUpiOnboardRequest(BaseModel):
    """Developer adds UPI VPA for payouts."""
    vpa: str  # e.g. developer@upi

    @field_validator("vpa")
    @classmethod
    def validate_vpa(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v:
            raise ValueError("VPA must contain @")
        return v


class RazorpayOnboardResponse(BaseModel):
    fund_account_id: str
    provider: str = "razorpay"
    onboarded: bool = True
