class Player:
    def __init__(self, token, name, websocket=None):
        self.token = token
        self.name = name
        self.websocket = websocket
        self.is_connected = True
        self.progress = None
        self.is_finished = False
        self.user_id = None  # set when the player is logged in: their results are saved
        self.is_twitch = False  # the virtual player fed by a linked Twitch chat

    def set_progress(self, progress):
        self.progress = progress

    def mark_finished(self):
        self.is_finished = True

    def disconnect(self):
        self.is_connected = False

    def reconnect(self, websocket):
        self.websocket = websocket
        self.is_connected = True

    def send_json(self, data):
        if self.websocket:
            return self.websocket.send_json(data)
        else:
            raise ValueError("Websocket is not connected")