# Description

This task is a one-time data curation task to prepare data for the Prelegal project.

## Plan

For context, the CommonPaper github account at `https://github.com/CommonPaper` contains a number of repos with legal agreement templates that can be copied and modified under a CC license. We will use this as our source of data.

## Action

For this task, we need to browse these repos online to review all of CommonPaper's repos, and retrieve all their markdown template legal agreements.

Then put all the markdown files in our Prelegal project in a directory called "templates".

Additionally, make a new json file called "catalog.json" in the project root that contains the name, description and filename of each of the markdown documents that has been downloaded to "templates".

Finally, add a text file in the "templates" directory to indicate that everything in this directory is under the appropiate CC By 4.5 license.