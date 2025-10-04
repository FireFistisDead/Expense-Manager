import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test_mongo():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    try:
        await client.admin.command('ping')
        print('MongoDB connection: SUCCESS')
        return True
    except Exception as e:
        print('MongoDB connection: FAILED -', str(e))
        return False
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_mongo())