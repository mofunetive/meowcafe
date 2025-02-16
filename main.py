import uuid
from fasthtml.common import *

app = FastHTML(exts='ws')
rt = app.route

users = {}
msgs = []

@rt('/')
def get(session):
    return  Html(
            Head(
                Title("Mofu Chat"),
                    Script(src='https://unpkg.com/@tailwindcss/browser@4')
                 ),
                Body(
                H1("Mofu Chat", cls='mb-8 text-xl'),
                    Form(
                        Input(id="name", cls='text-xl border-2 border-gray-500 p-2 rounded-md focus:border-teal-500'),
                        Button("Enter Chat", type='submit', cls='mt-8'),
                        id="form",
                        method="post",
                        action="/chat",
                        cls='flex flex-col'
                        ),
                    cls='flex flex-col h-screen justify-center items-center'
                )
            )

@rt('/chat')
def post(name: str, session):
    if "id" not in session:
        session['id'] = str(uuid.uuid4())

    session['name'] = name

    return Div(
        Div(Ul(*[Li(m) for m in msgs], id='msg-list')),
            Form(Input(id='msg'), id='form', ws_send=True),
            hx_ext='ws', ws_connect='/ws'
        )

def on_conn(ws, send):
    users[str(id(ws))] = send

def on_disconn(ws):
    users.pop(str(id(ws)), None)

@app.ws('/ws', conn=on_conn, disconn=on_disconn)
async def ws(msg:str, session):
    msgs.append([msg, session['name'], session['id']])
    # Use associated `send` function to send message to each user
    for u in users.values():
        await u(Ul(*[Li(f"{m[1]} ({m[2]})" +" said: " + m[0]) for m in msgs], id='msg-list'))

serve()