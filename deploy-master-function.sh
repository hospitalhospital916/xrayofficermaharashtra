#!/bin/sh
set -e
firebase use xrayunionmah
firebase deploy --only functions:masterSetMemberDefaultPasswords
