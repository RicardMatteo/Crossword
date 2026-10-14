import asyncio
import os
import random
import re
import unicodedata

import websockets

# Anonymous read-only access to Twitch chat: no OAuth app or token needed.
# Overridable to point the backend at a fake IRC server in tests.
IRC_URL = os.getenv("TWITCH_IRC_URL", "wss://irc-ws.chat.twitch.tv:443")
MAX_RETRY_DELAY = 60
CHANNEL_RE = re.compile(r"^[a-z0-9_]{3,25}$")
# Common chat bots: their one-word messages (commands, alerts) must not play
BOT_LOGINS = {
    "nightbot", "streamelements", "streamlabs", "moobot", "fossabot", "wizebot", "sery_bot",
    "soundalerts", "botisimo", "deepbot", "coebot", "phantombot", "ankhbot", "vivbot",
    "commanderroot", "pokemoncommunitygame", "kofistreambot", "streamstickers", "blerp",
}


def chat_word(text):
    """The word a chat message proposes, or None: the message must be the word
    alone. Case, accents, surrounding spaces and invisible characters (added by
    some chat clients) are ignored."""
    plain = unicodedata.normalize("NFD", text.upper())
    plain = "".join(c for c in plain if not unicodedata.combining(c) and not unicodedata.category(c).startswith("C"))
    plain = plain.strip()
    return plain if re.fullmatch(r"[A-Z]{2,}", plain) else None


def parse_irc(line):
    """Split an IRC line into (tags, prefix, command, params, trailing)."""
    tags = {}
    if line.startswith("@"):
        raw_tags, line = line[1:].split(" ", 1)
        tags = dict(tag.split("=", 1) if "=" in tag else (tag, "") for tag in raw_tags.split(";"))
    prefix = ""
    if line.startswith(":"):
        prefix, line = line[1:].split(" ", 1)
    trailing = None
    if " :" in line:
        line, trailing = line.split(" :", 1)
    command, *params = line.split(" ")
    return tags, prefix, command, params, trailing


class TwitchChat:
    """Reads a channel's chat and calls `on_message(viewer, text, login)` for each message.

    `on_status(status)` is told "connecting", "connected" or "disconnected";
    the connection is retried with a growing delay until `stop()`.
    """

    def __init__(self, channel, on_message, on_status):
        self.channel = channel
        self.on_message = on_message
        self.on_status = on_status
        self.task = None

    def start(self):
        self.task = asyncio.create_task(self._run())

    def stop(self):
        if self.task:
            self.task.cancel()
            self.task = None

    async def _run(self):
        delay = 1
        while True:
            try:
                await self.on_status("connecting")
                async with websockets.connect(IRC_URL) as ws:
                    await ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands")
                    await ws.send("PASS SCHMOOPIIE")
                    await ws.send(f"NICK justinfan{random.randint(10000, 99999)}")
                    await ws.send(f"JOIN #{self.channel}")
                    async for raw in ws:
                        if await self._handle(ws, raw) == "reconnect":
                            break
                        delay = 1
            except asyncio.CancelledError:
                raise
            except Exception as e:
                print(f"Twitch chat #{self.channel}: {e!r}")
            await self.on_status("disconnected")
            await asyncio.sleep(delay)
            delay = min(delay * 2, MAX_RETRY_DELAY)

    async def _handle(self, ws, raw):
        for line in raw.split("\r\n"):
            if not line:
                continue
            tags, prefix, command, params, trailing = parse_irc(line)
            if command == "PING":
                await ws.send(f"PONG :{trailing or 'tmi.twitch.tv'}")
            elif command == "366":  # end of NAMES: the channel is joined
                await self.on_status("connected")
            elif command == "RECONNECT":  # Twitch asks clients to reconnect
                return "reconnect"
            elif command == "PRIVMSG" and trailing:
                login = prefix.split("!", 1)[0]
                if login in BOT_LOGINS:
                    continue
                viewer = tags.get("display-name") or login
                try:
                    await self.on_message(viewer, trailing, login)
                except Exception as e:
                    print(f"Twitch chat #{self.channel}: error handling message: {e!r}")
