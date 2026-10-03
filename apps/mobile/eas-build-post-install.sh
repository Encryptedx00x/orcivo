#!/usr/bin/env bash
# EAS Build runs this automatically right after `pnpm install`, before the
# JS bundle step. The mobile app imports @orcivo/shared-types, whose
# package.json "main" points at dist/index.js — build output that's
# gitignored and only ever produced by an explicit `pnpm --filter
# @orcivo/shared-types build` (already a required step in every other
# consumer: Docker images, local dev). EAS's pipeline never runs it, so the
# bundler failed with "main module field that could not be resolved".
set -eo pipefail
cd "$(dirname "$0")/../.."
pnpm --filter @orcivo/shared-types build
