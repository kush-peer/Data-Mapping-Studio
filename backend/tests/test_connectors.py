import pytest
import tempfile
import os
from app.connectors import CSVConnector, EDIConnector


class TestCSVConnector:
    """Tests for CSV connector"""

    @pytest.fixture
    def csv_connector(self):
        return CSVConnector()

    @pytest.mark.asyncio
    async def test_detect_schema_csv(self, csv_connector):
        """Test CSV schema detection"""
        csv_data = b"name,age,salary\nJohn,30,50000\nJane,28,60000"

        schema = await csv_connector.detect_schema(file_content=csv_data)

        assert "fields" in schema
        assert len(schema["fields"]) == 3
        assert schema["fields"][0]["name"] == "name"
        assert schema["fields"][1]["name"] == "age"
        assert schema["fields"][2]["name"] == "salary"
        assert schema["fields"][1]["type"] == "number"

    @pytest.mark.asyncio
    async def test_read_data_csv(self, csv_connector):
        """Test reading CSV data"""
        csv_content = b"id,name,amount\n1,John,100.50\n2,Jane,200.75"

        # Write to temp file
        with tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.csv') as f:
            f.write(csv_content)
            temp_file = f.name

        try:
            records = []
            async for record in csv_connector.read_data(temp_file):
                records.append(record)

            assert len(records) == 2
            assert records[0]["name"] == "John"
            assert records[1]["amount"] == "200.75"

        finally:
            os.unlink(temp_file)

    @pytest.mark.asyncio
    async def test_write_data_csv(self, csv_connector):
        """Test writing CSV data"""
        data = [
            {"id": "1", "name": "John", "amount": "100"},
            {"id": "2", "name": "Jane", "amount": "200"}
        ]

        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv') as f:
            temp_file = f.name

        try:
            output_file = await csv_connector.write_data(temp_file, data)

            assert os.path.exists(output_file)

            with open(output_file, 'r') as f:
                content = f.read()
                assert "id,name,amount" in content
                assert "John" in content
                assert "Jane" in content

        finally:
            if os.path.exists(temp_file):
                os.unlink(temp_file)

    @pytest.mark.asyncio
    async def test_detect_delimiter_tab(self, csv_connector):
        """Test tab delimiter detection"""
        csv_data = b"name\tage\tsalary\nJohn\t30\t50000"

        schema = await csv_connector.detect_schema(file_content=csv_data)

        assert schema["delimiter"] == "\t"
        assert len(schema["fields"]) == 3


class TestEDIConnector:
    """Tests for EDI X12 connector"""

    @pytest.fixture
    def edi_connector(self):
        return EDIConnector()

    @pytest.mark.asyncio
    async def test_detect_schema_edi_837(self, edi_connector):
        """Test EDI 837 claims schema detection"""
        edi_content = b"""ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *210315*1300*^*00501*000000001*0*P*:~
GS*HC*SENDER*RECEIVER*20210315*1300*1*X*005010X222~
ST*837*0001*005010X222~
BHT*0019*00*1234*20210315*1300*CH~
NM1*IL*1*DOE*JOHN~
NM1*PR*2*INSURANCE CO~
CLM*12345*500*25*19*B*B*Y*B*11*E~
SE*10*0001~
GE*1*1~
IEA*1*000000001~"""

        schema = await edi_connector.detect_schema(file_content=edi_content)

        assert "fields" in schema
        assert schema["transaction_type"] == "837"
        assert schema["format"] == "edi_x12"
        assert "Claim" in schema.get("transaction_description", "")

    @pytest.mark.asyncio
    async def test_detect_schema_edi_835(self, edi_connector):
        """Test EDI 835 remittance schema detection"""
        edi_content = b"""ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *210315*1300*^*00501*000000001*0*P*:~
GS*HP*SENDER*RECEIVER*20210315*1300*1*X*005010X221~
ST*835*0001*005010X221~
BPR*C*1500*C*P*01*ACC*ACH~
NM1*PR*2*INSURANCE CO~
CLP*12345*1*500*450~
SE*8*0001~
GE*1*1~
IEA*1*000000001~"""

        schema = await edi_connector.detect_schema(file_content=edi_content)

        assert schema["transaction_type"] == "835"
        assert "Remittance" in schema.get("transaction_description", "")

    @pytest.mark.asyncio
    async def test_extract_transaction_type(self, edi_connector):
        """Test extracting transaction type from segments"""
        segments = [
            ["ISA", "00", "sender"],
            ["GS", "HC", "app"],
            ["ST", "837", "001"],
        ]

        trans_type = edi_connector._extract_transaction_type(segments)
        assert trans_type == "837"

    @pytest.mark.asyncio
    async def test_infer_edi_type(self, edi_connector):
        """Test EDI field type inference"""
        assert edi_connector._infer_edi_type("12345") == "number"
        assert edi_connector._infer_edi_type("20210315") == "date"
        assert edi_connector._infer_edi_type("JOHN DOE") == "string"
