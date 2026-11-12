# Playgram

Gamified social tasking with goals, achievements, competitions, and rewards. Make productivity fun with friends and family.

## Features

* Create or join shared goals, private or public
  * Private examples: "household chores", "running with friends", "bug squash marathon"
  * Public examples: "cleanup the bay", "wine tour", "city bikers"
* Tasks are added to goals, either assigned or shared (anyone can pick up), scheduled, one-off, or recurring/always available
* Create competitions (timed or ongoing) to track different members task completions
* Tasks give rewards defined by the goal space, either directly or through a coin-based shop to redeem
* Goal owners have a sliding scale of trust and verification for task completions

## Model

### Users 
* Social login (Google, Facebook, Instagram)
* Display name, profile pic(s), bio, interests, location
* Friends and groups
* Scores and Streaks
* Interests and badges
* Kid accounts/app with parental controls

### Groups/Teams
* Public or private
* Owner(s)
* Members (invite only for private)

### Goals (Top level data container)
* Public or private
* Owner(s)
* Members (invite only, request to join, self join)
* Geopraphic area (optional)
* Tasking rules (who can add, etc)

### Tasks
* Added to goals
* Personal (only task creator has access) or shared (anyone who has access to the goal has access to the task) -- goal owners must approve non-owners tasks to be shared
* Assignee(s) -- who is doing the task
* Can be assigned to users or teams
* Have rewards and/or coins
* Completion settings: self-report, requires verification, require photo 
* Scheduling: due date, recurring, timed, etc

### Rewards 
* Added to Goals
* Assigned to tasks, or purchasable with coins
* Type: permanent, redeemable, time-based
* Integration: payment processing, 3rd party rewards

### Achievements
* Added to Goals
* Task/Goal requirements
* System default generic achievements (First Task, etc)

### Competitions
* Members/Teams
* Start/End
* Tracking Goal/Tasks leaderboard
