import requests

url = "http://localhost:8000/auth/signup"
resp = requests.post(url, json={"name": "Test User", "email": "test@test.com", "password": "securepassword"})
token = ""
if resp.status_code != 200:
    resp = requests.post("http://localhost:8000/auth/login", json={"email": "test@test.com", "password": "securepassword"})
    if resp.status_code == 200:
        token = resp.json()["access_token"]
else:
    token = resp.json()["access_token"]

if token:
    videos = requests.get("http://localhost:8000/videos").json()
    if videos:
        video_id = videos[0]["id"]
        res = requests.post("http://localhost:8000/like", json={"video_id": video_id, "action": "like"}, headers={"Authorization": f"Bearer {token}"})
        print(res.status_code, res.text)
    else:
        print("no videos")
else:
    print("could not get token")
