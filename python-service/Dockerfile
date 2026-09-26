FROM python:3.14-slim

WORKDIR /app

# pip y setuptools vienen empaquetados en la imagen base y pueden traer CVEs
# conocidos incluso sin que el proyecto los use directamente en runtime.
RUN pip install --no-cache-dir --upgrade pip setuptools

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
