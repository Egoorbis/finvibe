from app.security import valid_email, create_access_token, decode_token

def test_valid_email():
    assert valid_email("user@example.com")
    assert not valid_email("not-an-email")

def test_jwt_roundtrip():
    user={"id":1,"username":"tester","email":"tester@example.com"}
    token=create_access_token(user)
    payload=decode_token(token)
    assert payload["id"]==1
    assert payload["email"]==user["email"]
