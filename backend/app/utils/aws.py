import os
import boto3
from botocore.exceptions import BotoCoreError, ClientError

def get_s3_client():
    return boto3.client(
        's3',
        region_name=os.getenv('AWS_REGION', 'us-east-1'),
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    )


def create_presigned_upload_url(key: str, content_type: str) -> dict:
    s3_bucket = os.getenv('AWS_S3_BUCKET', '')
    if not s3_bucket:
        raise RuntimeError('AWS_S3_BUCKET is not configured')

    s3_client = get_s3_client()
    try:
        upload_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': s3_bucket,
                'Key': key,
                'ContentType': content_type,
                'ACL': 'public-read',
            },
            ExpiresIn=900,
        )
    except (BotoCoreError, ClientError) as exc:
        raise RuntimeError(str(exc))

    asset_url = f'https://{s3_bucket}.s3.amazonaws.com/{key}'
    return {'upload_url': upload_url, 'asset_url': asset_url}
