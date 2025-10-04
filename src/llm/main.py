import json
import base64
import io
from google.genai import Client, types

import os
from pydantic import BaseModel, ValidationError
from dotenv import load_dotenv


load_dotenv()

# Configure the API key
# Make sure to set the GOOGLE_API_KEY environment variable in your system
client = Client(api_key=os.getenv("GOOGLE_API_KEY", "AIzaSyC3h7tFZeXTtLHA99S0PbJt5aMzAup7Wrk"))

generation_config = types.GenerationConfig(
    temperature=0.2,
    max_output_tokens=2048
)

class ReceiptData(BaseModel):
    amount: float
    currency_code: str
    category: str
    expense_date: str
    description: str
    remarks: str

def extract_receipt_data(image_data: str) -> dict:
    """
    Extracts receipt data from a base64 encoded image using the Gemini 2.5 Flash model.

    Args:
        image_data (ImageData): An ImageData object containing the base64 encoded image string.

    Returns:
        ReceiptData: A ReceiptData object containing the extracted receipt data.
    """
    # Decode the base64 string


    image_data = image_data.replace("data:image/jpeg;base64,", "")
    image_data = image_data.replace("data:image/png;base64,", "")
    image_data = image_data.replace("data:image/gif;base64,", "")
    image_data = image_data.replace("data:image/webp;base64,", "")
    image_data = image_data.replace("data:image/svg+xml;base64,", "")
    image_data = image_data.replace("data:image/tiff;base64,", "")
    image_data = image_data.replace("data:image/bmp;base64,", "")
    image_data = image_data.replace("data:image/x-icon;base64,", "")

    try:
        image_bytes = base64.b64decode(image_data)
    except (base64.binascii.Error, IOError) as e:
        print(f"Error decoding base64 string or opening image: {e}")
        return None


    # Create the prompt
    prompt = """
    You are an expert receipt processing agent. Your task is to extract the following information from the provided receipt image:
    1.  **Amount:** The total amount of the expense.
    2.  **Currency Code:** The ISO 4217 currency code (e.g., USD, EUR, INR).
    3.  **Category:** The category of the expense (e.g., Food, Travel, Utilities).
    4.  **Expense Date:** The date of the expense in YYYY-MM-DD format.
    5.  **Description:** A brief description of the expense.
    6.  **Remarks:** Any additional remarks or notes about the expense.

    Please provide the output in a structured JSON format.
    """

    response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[prompt, types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")],
    config={
        "response_mime_type": "application/json",
        "response_schema": ReceiptData
            },
    )
    # Use the response as a JSON string.
    if response.parsed:
        return response.parsed.model_dump()
    else:
        return None