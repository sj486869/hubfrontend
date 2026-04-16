from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

from app.database import db

categories = [
    {'slug': 'desi-mms', 'name': 'Desi MMS', 'thumbnail_url': None},
    {'slug': 'desi-porn', 'name': 'Desi Porn', 'thumbnail_url': None},
    {'slug': 'desi-porn-videos', 'name': 'Desi Porn Videos', 'thumbnail_url': None},
    {'slug': 'desifile', 'name': 'DesiFile', 'thumbnail_url': None},
    {'slug': 'desitales', 'name': 'DesiTales', 'thumbnail_url': None},
    {'slug': 'dropmms', 'name': 'DropMMS', 'thumbnail_url': None},
    {'slug': 'fsiblog', 'name': 'Fsiblog', 'thumbnail_url': None},
    {'slug': 'fsiblog3', 'name': 'Fsiblog3', 'thumbnail_url': None},
    {'slug': 'fsiblog5', 'name': 'Fsiblog5', 'thumbnail_url': None},
    {'slug': 'indian-mms', 'name': 'Indian MMS', 'thumbnail_url': None},
    {'slug': 'indian-bf-videos', 'name': 'Indian BF Videos', 'thumbnail_url': None},
    {'slug': 'kamababa', 'name': 'Kamababa', 'thumbnail_url': None},
    {'slug': 'mmsdose', 'name': 'Mmsdose', 'thumbnail_url': None},
    {'slug': 'vid65', 'name': 'Vid65', 'thumbnail_url': None},
    {'slug': 'videmms', 'name': 'Videmms', 'thumbnail_url': None},
]

videos = [
    {
        'title': 'Midnight Desi Flow',
        'description': 'A cinematic Desi MMS experience with premium storytelling.',
        'duration': '12:34',
        'views': 14500,
        'likes': 1200,
        'dislikes': 24,
        'category': 'desi-mms',
        'tags': ['desi', 'mms', 'cinematic'],
        'thumbnail_url': 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80',
        'video_url': 'https://www.w3schools.com/html/mov_bbb.mp4',
        'created_at': datetime.utcnow().isoformat(),
    },
    {
        'title': 'DesiTales Exclusive',
        'description': 'Premium adult storytelling from the DesiTales collection.',
        'duration': '09:18',
        'views': 22700,
        'likes': 2100,
        'dislikes': 18,
        'category': 'desitales',
        'tags': ['premium', 'desitales', 'exclusive'],
        'thumbnail_url': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
        'video_url': 'https://www.w3schools.com/html/movie.mp4',
        'created_at': datetime.utcnow().isoformat(),
    },
]

async def seed():
    await db.categories.delete_many({})
    await db.videos.delete_many({})
    await db.categories.insert_many(categories)
    await db.videos.insert_many(videos)
    print('Seed data inserted')

if __name__ == '__main__':
    import asyncio

    asyncio.run(seed())
