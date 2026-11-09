import httpx

r = httpx.post("http://127.0.0.1:8000/api/auth/login", json={"email": "carlos@agendateens.com", "password": "senha123"})
user = r.json()["user"]
token = r.json()["token"]
print("Carlos user:", user["name"], "Tags:", user["tags"])

events_resp = httpx.get("http://127.0.0.1:8000/api/events", headers={"Authorization": f"Bearer {token}"})
events = events_resp.json()
print("Visible events count for Carlos:", len(events))
for e in events:
    print(f"- {e['title']} (Tags: {e.get('tags')}, Global: {e.get('is_global')})")

