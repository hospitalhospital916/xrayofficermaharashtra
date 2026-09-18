@echo off
firebase use xrayunionmah
firebase deploy --only functions:masterSetMemberDefaultPasswords
pause
