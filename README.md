# Switchex

Switch between two local OpenAI Codex accounts from VS Code.

Switchex is a small VS Code extension for people who use Codex with more than one login. It stores two local Codex `auth.json` profiles in VS Code Secret Storage, lets you switch the active account from the status bar or Command Palette, and reloads the window so Codex picks up the selected account.

![Switchex icon](image.png)

## Why use it

- Switch Codex accounts without manually copying `~/.codex/auth.json`.
- Keep saved Codex logins in VS Code Secret Storage.
- See the active saved account in the VS Code status bar.
- Save, replace, switch, and delete two Codex account slots.
- Works with the default Codex auth path and respects `CODEX_HOME` when it is set.

## Common searches

Switchex helps with workflows people often describe as:

- Codex multiple accounts
- Codex switch accounts
- OpenAI Codex account switcher
- Switch Codex account in VS Code
- Multiple Codex accounts in VS Code

## Usage

1. Sign in to Codex normally so your current `auth.json` exists.
2. Run `Switchex: Save Current Login as Account 1`.
3. Sign in to your second Codex account.
4. Run `Switchex: Save Current Login as Account 2`.
5. Click the Switchex status bar item or run `Switchex: Choose Account`.
6. Select the account you want to use.

When you switch accounts, Switchex updates the active Codex `auth.json` and reloads the VS Code window.

## Commands

| Command | Description |
| --- | --- |
| `Switchex: Choose Account` | Open the account picker. |
| `Switchex: Save Current Login as Account 1` | Save the currently active Codex login in slot 1. |
| `Switchex: Save Current Login as Account 2` | Save the currently active Codex login in slot 2. |

Switch and delete actions are available from the account picker.

## Privacy

Switchex does not log your Codex credentials. Saved account profiles are stored through VS Code Secret Storage, and only non-secret metadata such as account labels, email detection, fingerprints, and save times are kept in extension state.

## Notes

- Switchex manages two saved Codex account slots.
- The active Codex auth file is resolved from `CODEX_HOME/auth.json` when `CODEX_HOME` is set, otherwise `~/.codex/auth.json`.
- You should only save accounts that you control and are allowed to use on the machine.
