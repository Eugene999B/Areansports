# Game profile truth and ownership policy

## Purpose

A game profile connects an ArenaSports player to a public username visible in a supported mobile game. It is not a login integration and must never require a game password, one-time code, account cookie, recovery answer, government identity document, or intercepted game traffic.

ArenaSports is independent from Konami and Electronic Arts unless a future written provider agreement says otherwise.

## Truth labels

### `UNVERIFIED`

The player supplied the public username. ArenaSports has not established ownership through an authorised game-provider integration or a completed community review.

This is the default for every new profile.

### `COMMUNITY_CONFIRMED`

ArenaSports completed a documented community ownership review using proportionate evidence and found the claim sufficiently supported for community competition.

This label does **not** mean the game publisher verified the account. It must always be displayed as “community-confirmed” with that limitation available to the viewer.

### `AUTHORIZED_PROVIDER_VERIFIED`

An authorised provider integration verified the relationship according to a documented adapter and provider agreement.

This state is reserved for future infrastructure. Username matching, screenshots, moderator judgement, scraping, or unofficial APIs may never set this state.

## Normalisation and duplicate protection

Before comparison, usernames are:

- normalised with Unicode NFKC;
- trimmed;
- collapsed to single internal spaces;
- compared case-insensitively using a stable locale.

Control characters, zero-width characters, and bidirectional override/isolation characters are rejected. The original cleaned public casing remains available for display.

Within one game, platform, and region, a normalised public username may be linked only once. A player may hold only one active profile in the same game, platform, and region slot.

Normalisation reduces accidental duplicates and simple impersonation. It is not proof of legal identity or game-account ownership.

## Visibility

A profile is public only when:

- the ArenaSports account is active;
- the ArenaSports profile is public; and
- the individual game profile is public.

Hidden profiles remain available to their owner. Public endpoints must not reveal hidden, suspended, or deleted accounts through distinguishable error details.

## Ownership challenges

A signed-in player may open an ownership challenge against a visible profile when they reasonably believe the public game identity belongs to them or is impersonating them.

The challenger must provide a concrete statement. They may not challenge their own profile or open multiple simultaneous challenges against the same profile.

Opening a challenge:

- creates an audited review case;
- does not automatically remove the profile;
- does not suspend or punish either player;
- does not change the verification label automatically; and
- does not make the challenger’s statement public.

Support may request the least-sensitive evidence reasonably necessary. Passwords, login codes, recovery credentials, full account exports, government identity documents, or remote-device access are prohibited.

## Resolution principles

Reviewers must record a reason and choose one of:

- retain the existing profile;
- remove or reassign the disputed link according to an approved recovery process;
- dismiss an unsupported or abusive challenge; or
- allow the challenger to withdraw.

Privileged resolution operations require stronger authentication, role authorization, audit events, and a separate implementation slice before production use.

## Retention and privacy

Challenge statements and review evidence are private safety data. Retention must be limited, access-controlled, and approved with the broader Ghana pilot privacy and safeguarding plan. Public game usernames may remain in competition snapshots when needed to preserve historical tournament records, even if the current profile later changes or is hidden.
