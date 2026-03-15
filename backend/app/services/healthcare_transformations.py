"""
Healthcare-specific transformations and utilities.

This module provides domain-specific transformations for healthcare data
including medical code lookups, format conversions, and validation.
"""

import re
from typing import Optional, Dict, List
from datetime import datetime


class HealthcareTransformations:
    """Healthcare-specific data transformations"""

    # Medical code lookups (simplified - in production would use complete UMLS/SNOMED databases)
    ICD9_TO_ICD10_MAP = {
        "250.00": "E10.9",      # Diabetes Type 1
        "250.10": "E11.9",      # Diabetes Type 2
        "401.9": "I10",         # Hypertension
        "414.01": "I25.10",     # Coronary artery disease
        "428.0": "I50.9",       # Heart failure
    }

    CPT_DESCRIPTIONS = {
        "99213": "Office visit, established patient, low complexity",
        "99214": "Office visit, established patient, moderate complexity",
        "99215": "Office visit, established patient, high complexity",
        "70553": "MRI brain without contrast",
    }

    @staticmethod
    def validate_npi(npi: str) -> bool:
        """
        Validate NPI (National Provider Identifier) format and checksum.
        NPI is a 10-digit number with Luhn algorithm checksum.
        """
        npi = str(npi).strip()

        # Must be 10 digits
        if not re.match(r'^\d{10}$', npi):
            return False

        # Luhn algorithm validation
        digits = [int(d) for d in npi]
        checksum = 0

        for i, digit in enumerate(reversed(digits)):
            if i % 2 == 1:  # Every second digit (from right)
                digit *= 2
                if digit > 9:
                    digit -= 9

            checksum += digit

        return checksum % 10 == 0

    @staticmethod
    def format_npi(npi: str) -> str:
        """Format NPI as standard format: XX-XXX-XXXXX"""
        npi = str(npi).replace("-", "").strip()
        if len(npi) == 10:
            return f"{npi[0:2]}-{npi[2:5]}-{npi[5:10]}"
        return npi

    @staticmethod
    def validate_medical_record_number(mrn: str) -> bool:
        """
        Validate MRN (Medical Record Number).
        Format varies by system, but typically:
        - 6-12 alphanumeric characters
        - No spaces or special characters (except hyphen)
        """
        return bool(re.match(r'^[A-Z0-9\-]{6,12}$', str(mrn).upper()))

    @staticmethod
    def validate_mrn(mrn: str) -> bool:
        """Alias for validate_medical_record_number"""
        return HealthcareTransformations.validate_medical_record_number(mrn)

    @staticmethod
    def parse_hl7_date(hl7_date: str) -> Optional[str]:
        """
        Convert HL7 date format to ISO 8601.
        HL7 Date: YYYYMMDD or YYYYMMDDHHMM[SS]
        ISO 8601: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
        """
        if not hl7_date:
            return None

        hl7_date = str(hl7_date).strip()

        try:
            if len(hl7_date) >= 8:
                year = hl7_date[0:4]
                month = hl7_date[4:6]
                day = hl7_date[6:8]

                iso_date = f"{year}-{month}-{day}"

                # Add time if present
                if len(hl7_date) >= 12:
                    hour = hl7_date[8:10]
                    minute = hl7_date[10:12]
                    iso_date += f"T{hour}:{minute}"

                    if len(hl7_date) >= 14:
                        second = hl7_date[12:14]
                        iso_date += f":{second}"

                return iso_date
        except:
            pass

        return None

    @staticmethod
    def parse_iso_date(iso_date: str) -> Optional[str]:
        """
        Convert ISO 8601 date to HL7 format.
        ISO: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
        HL7: YYYYMMDD or YYYYMMDDHHMM[SS]
        """
        if not iso_date:
            return None

        try:
            # Parse ISO date
            if "T" in str(iso_date):
                dt = datetime.fromisoformat(iso_date)
                return dt.strftime("%Y%m%d%H%M%S")
            else:
                dt = datetime.strptime(str(iso_date), "%Y-%m-%d")
                return dt.strftime("%Y%m%d")
        except:
            pass

        return None

    @staticmethod
    def map_icd9_to_icd10(icd9_code: str) -> Optional[str]:
        """Map ICD-9 diagnosis code to ICD-10."""
        icd9_code = str(icd9_code).strip()
        return HealthcareTransformations.ICD9_TO_ICD10_MAP.get(icd9_code)

    @staticmethod
    def validate_icd10(icd10_code: str) -> bool:
        """
        Validate ICD-10 code format.
        Format: L.LLLL or L.LLL.L where L = letter/digit
        Examples: E10.9, I25.10, A00.0
        """
        return bool(re.match(r'^[A-Z]\d[A-Z0-9]*\.\d[A-Z0-9]*$', str(icd10_code).strip()))

    @staticmethod
    def validate_cpt_code(cpt_code: str) -> bool:
        """
        Validate CPT (Current Procedural Terminology) code.
        Format: 5 digits or 4 digits + modifier
        Examples: 99213, 70553, 99213-26
        """
        return bool(re.match(r'^\d{5}(-[A-Z]{2})?$', str(cpt_code).strip()))

    @staticmethod
    def get_cpt_description(cpt_code: str) -> Optional[str]:
        """Get description for CPT code."""
        return HealthcareTransformations.CPT_DESCRIPTIONS.get(str(cpt_code).strip())

    @staticmethod
    def normalize_phone(phone: str) -> str:
        """
        Normalize phone number to standard format.
        Input: various formats (1234567890, 123-456-7890, (123) 456-7890, etc.)
        Output: (123) 456-7890
        """
        phone = str(phone).strip()
        # Remove all non-digits
        digits = re.sub(r'\D', '', phone)

        # Return only last 10 digits (removes country code if present)
        if len(digits) >= 10:
            digits = digits[-10:]

        if len(digits) == 10:
            return f"({digits[0:3]}) {digits[3:6]}-{digits[6:10]}"

        return phone

    @staticmethod
    def normalize_ssn(ssn: str) -> str:
        """
        Normalize SSN to XXX-XX-XXXX format.
        Note: This function doesn't validate, just formats.
        """
        ssn = str(ssn).strip()
        # Remove non-digits
        digits = re.sub(r'\D', '', ssn)

        if len(digits) == 9:
            return f"{digits[0:3]}-{digits[3:5]}-{digits[5:9]}"

        return ssn

    @staticmethod
    def mask_phi(value: str, mask_type: str = "ssn") -> str:
        """
        Mask Personally Identifiable Health Information (PHI).
        mask_type: "ssn", "mrn", "phone", "name", "dob"
        """
        value = str(value).strip()

        if mask_type == "ssn":
            # XXX-XX-1234
            return f"XXX-XX-{value[-4:]}" if len(value) >= 4 else value

        elif mask_type == "mrn":
            # XXXXXX-1234
            return f"XXXXXX-{value[-4:]}" if len(value) >= 4 else value

        elif mask_type == "phone":
            # (XXX) XXX-7890
            digits = re.sub(r'\D', '', value)
            if len(digits) >= 4:
                return f"(XXX) XXX-{digits[-4:]}"
            return value

        elif mask_type == "name":
            # J. Doe
            parts = value.split()
            if len(parts) >= 2:
                return f"{parts[0][0]}. {parts[-1]}"
            return value

        elif mask_type == "dob":
            # XXXX-XX-20
            if len(value) >= 2:
                return f"XXXX-XX-{value[-2:]}"
            return value

        return value

    @staticmethod
    def gender_code_to_fhir(hl7_gender: str) -> str:
        """
        Convert HL7 gender code to FHIR gender.
        HL7: M=Male, F=Female, O=Other, A=Ambiguous, U=Unknown
        FHIR: male, female, other, unknown
        """
        mapping = {
            "M": "male",
            "F": "female",
            "O": "other",
            "A": "other",
            "U": "unknown",
        }

        return mapping.get(str(hl7_gender).upper(), "unknown")

    @staticmethod
    def fhir_gender_to_hl7(fhir_gender: str) -> str:
        """Convert FHIR gender to HL7."""
        mapping = {
            "male": "M",
            "female": "F",
            "other": "O",
            "unknown": "U",
        }

        return mapping.get(str(fhir_gender).lower(), "U")

    @staticmethod
    def marital_status_hl7_to_fhir(hl7_status: str) -> str:
        """
        Convert HL7 marital status to FHIR.
        HL7: A=Annulled, D=Divorced, L=Legally Separated, M=Married, etc.
        """
        mapping = {
            "A": "annulled",
            "D": "divorced",
            "L": "legally-separated",
            "M": "married",
            "P": "polygamous",
            "S": "never-married",
            "T": "domestic-partnership",
            "U": "unmarried",
            "W": "widowed",
        }

        return mapping.get(str(hl7_status).upper(), "unknown")

    @staticmethod
    def detect_phi(value: str) -> Dict[str, bool]:
        """
        Detect if value contains PHI (Protected Health Information).
        Returns dict of PHI types found.
        """
        value = str(value).strip()

        return {
            "ssn": bool(re.search(r'\d{3}-\d{2}-\d{4}|\d{9}', value)),
            "npi": bool(re.search(r'^\d{10}$', value)),
            "mrn": bool(re.search(r'^[A-Z0-9\-]{6,12}$', value)),
            "phone": bool(re.search(r'\(\d{3}\) \d{3}-\d{4}|\d{3}-\d{3}-\d{4}', value)),
            "zip_code": bool(re.search(r'^\d{5}(-\d{4})?$', value)),
            "date": bool(re.search(r'\d{4}-\d{2}-\d{2}', value)),
        }

    @staticmethod
    def calculate_age(dob: str) -> Optional[int]:
        """
        Calculate age from date of birth.
        Supports formats: YYYY-MM-DD, YYYYMMDD
        """
        try:
            if "-" in str(dob):
                dt = datetime.strptime(dob, "%Y-%m-%d")
            else:
                dt = datetime.strptime(str(dob), "%Y%m%d")

            today = datetime.now()
            age = today.year - dt.year - ((today.month, today.day) < (dt.month, dt.day))
            return age
        except:
            return None

    @staticmethod
    def validate_bmi(weight_kg: float, height_m: float) -> Dict[str, any]:
        """
        Calculate BMI and return category.
        """
        if height_m <= 0 or weight_kg <= 0:
            return {"bmi": None, "category": "invalid"}

        bmi = weight_kg / (height_m ** 2)

        if bmi < 18.5:
            category = "underweight"
        elif bmi < 25:
            category = "normal"
        elif bmi < 30:
            category = "overweight"
        else:
            category = "obese"

        return {"bmi": round(bmi, 1), "category": category}
