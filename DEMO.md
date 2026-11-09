# Judge walkthrough

Typed khata works with no Gnani key. Voice shows a missing-key message until `GNANI_API_KEY` is set on the server.

1. Open `/`. The hero is its own full section: what BolKhata is, then Start a shop and Sign in. How it works, voice, the books, and confirm-before-save are separate sections below.
2. Get started: shop name, your name, email, optional shop phone. Remember the email. No email is sent.
3. You land on **Home**: udhaar outstanding, jama, kiraya due, bills due, customer count, and recent activity. A new shop is empty. Sample data is only under **Settings**, and it is labeled as fictional `90000 11111` / `22222` / `33333`.
4. Open **Baat**. Press Enter to send (Shift+Enter starts a new line). Type `Add Ramesh Kumar, 90000 11111`. The card shows the name and phone in large type. Confirm stays off until the phone has 10 digits. Tap **Confirm**. The line stays on the one shop thread, which is stored for that shop, and an Undo toast sits for 8 seconds. Leave Chat and come back, or refresh: the same board is still there. Sidebar tabs should switch without a long blank load.
5. Type a messy line such as `bhai ramesh ko atta ka hisaab laga do 250`. With `OPENAI_API_KEY` on the server, `POST /api/interpret` prepares the udhaar draft. Without that key, or if OpenAI fails, the same box uses the built-in parser (`Ramesh ko 250 rupay udhaar, atta 5 kilo` still works). Confirm the person (name + `90000 11111`), the amount, the note, and the next balance. The model never writes by itself. After Confirm, Home and **Udhaar** both show the line. A question such as `kiraya kitna due hai` can come back as a short reply and does not open a write.
6. On **Udhaar**, search, sort a column, and open the row to edit the amount or assign another grahak. **Jama**, **Kiraya**, and **Bills** have the same kind of table, plus an Add button that opens the same confirm card.
7. **Grahak** shows the balance. Open a person for their lines. Phone contacts work where the browser allows a picker; otherwise add by hand.
8. Sign out, then Sign in with the same email, or tap **Continue with Google**. If that Google email already has one shop, you land in Home. If it has several, pick the shop name. If it has none, setup opens with the Google email and name filled in — name the dukaan. Email sign-in still works. Google must be enabled for this domain in the Firebase console (`bolkhata.harshgupta24716.workers.dev`, no `https://`).

In **Settings**, switch Language from Hinglish to English. Tab names, titles, and buttons change immediately. Switch back when you want Hinglish again. **Load sample data** can be tapped only until the fictional lines exist; a second tap does not add another Imran credit. On a phone, Credit and the other books are stacked cards. **Yaad** on Customers lets you add, edit, or remove a memory note.

Logged-out `/app` redirects to Sign in. Empty contacts with no ledger line are removed after a short grace period so the language step only sees the people who matter.
