---
name: Salla package firewall
description: Replit package-proxy behavior observed while installing this Salla theme's dependencies.
---

The Replit package proxy returned HTTP 403 for the public `@salla.sa/twilight` package and continued to block the update attempt without an authorization header.

**Why:** This core theme dependency is required to build the project, and routing around the managed package proxy is not a safe workaround.

**How to apply:** If this recurs, keep the post-merge script configured, do not bypass the proxy or replace Twilight, and retry after package access is restored.
