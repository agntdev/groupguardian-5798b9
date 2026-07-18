# GroupGuard Moderation Bot — Bot specification

**Archetype:** custom

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

Automated Telegram group moderation bot with verification, spam detection, admin controls, and audit logging. Enforces rules through verification buttons, configurable thresholds, and tracks moderation actions with stats and logs.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Telegram group administrators
- Moderators of public/community groups
- Group members requiring verification

## Success criteria

- New members verified within 1 minute or auto-removed
- Spam messages detected and silenced per configured rules
- Admins can access audit logs and stats
- Non-admins cannot bypass verification or moderation rules

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu for verified members
- **I'm human / Verify** (button, actor: user, callback: verify:confirm) — Verification button for new members
- **/setwelcome** (command, actor: admin, command: /setwelcome) — Configure welcome message template
- **/setthresholds** (command, actor: admin, command: /setthresholds) — Adjust spam detection thresholds
- **/viewlog** (command, actor: admin, command: /viewlog) — Display recent moderation actions log

## Flows

### member_verification
_Trigger:_ user_join

1. Send welcome message with verification button
2. Wait 1 minute for button click
3. If verified: lift restrictions and confirm
4. If timeout: remove user and delete recent messages

_Data touched:_ Member, Verification session

### spam_enforcement
_Trigger:_ message_post

1. Check message against spam rules
2. Apply configured action (warn/mute/kick/ban)
3. Post action explanation in group
4. Log action in audit trail

_Data touched:_ Member, Rule/threshold, Action log entry

### admin_controls
_Trigger:_ /admin_command

1. Verify admin privileges
2. Execute command (warn/mute/etc)
3. Update relevant data entities
4. Provide confirmation response

_Data touched:_ Member, Rule/threshold, Trusted user list

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **Member** _(retention: persistent)_ — Telegram user in the group with metadata
  - fields: user_id, display_name, join_time, trust_status, admin_status
- **Verification session** _(retention: session)_ — Pending verification state for new members
  - fields: user_id, timestamp, timeout_duration
- **Rule/threshold** _(retention: persistent)_ — Spam detection rules and action mappings
  - fields: rule_type, threshold_value, action_mapping
- **Action log entry** _(retention: persistent)_ — Audit record of moderation actions
  - fields: action_type, target_user, reason, timestamp, initiator, is_automated
- **Welcome template** _(retention: persistent)_ — Customizable onboarding message
  - fields: text_content, button_label, timeout_notice

## Integrations

- **Telegram Bot API** (required) — Group chat moderation and user interactions
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- /warn
- /mute <duration>
- /kick
- /ban
- /trust
- /untrust
- /setwelcome
- /setrules
- /setthresholds
- /viewlog
- /stats

## Notifications

- Admin alerts for automated actions (configurable visibility)
- Verification timeout explanations for admins

## Permissions & privacy

- Bot requires admin privileges to manage members and messages
- Never targets admin users or pinned messages
- Action logs only visible to admins via /viewlog
- User data stored only for verification session duration

## Edge cases

- User joins and leaves before verification timeout
- Message rate spikes during verification period
- Multiple spam triggers on single message
- Admins changing rules during active moderation

## Required tests

- Verification timeout removes unverified users after 1 minute
- Spam rules trigger correct automated actions
- Admin commands only execute for authorized users
- Action logs retain last 1000 entries

## Assumptions

- Default 48-hour account age threshold for new-link spam
- 3 repeats within 2 minutes triggers identical-message detection
- 5 messages in 10 seconds triggers flood detection
- Action log retention defaults to 1000 entries
