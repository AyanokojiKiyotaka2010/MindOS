import ipaddress
import socket
from urllib.parse import urlparse

from fastapi import HTTPException, status


def validate_import_url(raw_url: str) -> str:
    parsed = urlparse(raw_url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only HTTP and HTTPS URLs are allowed")
    if parsed.username or parsed.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Credentials in URLs are not allowed")

    try:
        addresses = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL hostname could not be resolved")

    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Private and local network URLs are not allowed")
    return raw_url.strip()
