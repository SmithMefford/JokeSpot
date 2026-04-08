Create 1 document per team, within the milestones folder in the project directory, that describes how, at least, 3 features within your finished product will be tested.  
The test plans should include specific test cases (user acceptance test cases) that describe the data and the user activity that will be executed in order to verify proper functionality of the feature.  
The test plans should include a description of the test data that will be used to test the feature.  
The test plans should include a description of the test environment ( localhost / cloud ) that will be used to test the feature.  
The test plans should include a description of the test results that will be used to test the feature.  
The test plan should include information about the user acceptance testers.  
The actual test results based on observations after executing the tests    
(needs to be done)

Feature 1: Posting (Sam)  
Description: posting will allow users to interact with the application by adding their own content to the site by creating and posting. Posts will add messages to the database to be displayed on the feed page that is shown to other users, posts will contain nonempty messages composed of text.  
Test Environment: The test environment will happen on localhost using desktop/laptop testing with dependencies on node.js, a postgresql database, and handlebars to display and maintain application functionality. There will not be a requirement to test this application under wifi connection due to the local nature of the test server.
Test Cases:  
“Hello World!” input:  
- Expected outcome: post successfully submits to the database, gets processed onto the feed page, and appears to other users with the correct “Hello World” text in the post container  
Empty string input:  
- Expected outcome: Post will not post, nothing will be returned to the database and no posts will be parsed onto the feed. User will receive a message saying that they cannot post empty content and will be prompted to fill the post draft box with content before continuing.  
Supremely long string input:  
- Expected outcome: Post will not post, nothing will be returned to the database and no posts will be parsed onto the feed. User will receive a message saying that they can’t post content above a certain character limit (ex: 2000 characters) and will be prompted to shorten their post before they are allowed to continue.  
Special Character input:  
- Expected outcome: Post will be submitted to the database, will be grabbed from the database to the application, and shown on the feed page. Users will be able to correctly see special character input and characters will render correctly  
Post with vulgar content:  
-  Expected outcome: post will be submitted to the database, flagged as having vulgar content, and will exist within the database, on the applications end, users that have the setting for vulgar content will be able to see the post, while those who have it disabled will not be shown the post. In the fist scenario, jokes will be fed onto the feed page and shown to the users. In the second scenario, jokes will not male it onto the feed page and will exist solely in the database.  

 this ensures to developers that this function works correctly, to testing engineers that any issues are flagged with error codes and can be fixed in the code, and to end users that they are able to functionally post onto this application

Feature 2: Scrolling (Michael)  


Feature 3: Admin deletion of users and cascading deletions of posts by that user (Smith):

Description: The Admin Deletion feature allows a platform administrator to permanently delete a registered user account from the system. Upon deletion of a user, all joke posts authored by that user must also be deleted automatically. This maintains database integrity and removes all associated, potentially harmful, content from the platform.

Test Environment:The test environment will happen on localhost using desktop/laptop testing with dependencies on node.js, a postgresql database, and handlebars to display and maintain application functionality. There will not be a requirement to test this application under wifi connection due to the local nature of the test server.

Test Data: To properly test these features there will need to be several users in the database as well as a user with superuser permissions (user0 in our case). There will need to be a database loaded with jokes, some of which flagged by other users.

Test Cases:
Admin can access the Manage Users Panel:
 - Expected outcome: The superuser is able to login to the website with the superuser credentials and is able to access a specific link to access the Manage Users Panel. The superuser should be able to see and interact with the content contained in this page where they are able to search up specific users, see their total number of reports, and remove them from the website. 
Non-Admins cannot access the Manage Users Panel:
 - Expected outcome: A regular user is able to login to the website with their stored credentials, and has access to all of the regular authenticated pages and guest pages, but cannot see a link to the Manage Users Panel. Additionally if the user attempts to redirect to the Admin Panel directly they will recieve the error 403 forbidden.
Admin receives confirmation prompt before deletion
 - Expected outcome: When the admin is on the Manage Users Panel and selects the button to delete a user for a given account they will recieve a popup prompting them to verify the deletion of the user, clicking cancel will prevent the account's deletion and return the admin to the Admin panel and the selected users account and jokes will not be deleted. Verifying will continue with deletion.
User and jokes are removed from database on deletion
 - After the Admin verifies the deletion of a user a query is sent to the database to remove the user from the database entirely, which will also cascade and delete all of their posted jokes if they have any jokes posted. Once this process is complete the admin will recieve a success message and be returned to the Admin panel.
Deleted User Cannot log back in
 - As a user, if my account is deleted, I should not be able to log into my old account, and will not be able to access the site with the old credentials recieving the error that account does not exist.

Tester Information:
An administrator-level user (One of the coders) familiar with the manage users panel
A regular authenticated user with no admin privileges that has posted a flagged joke
A regular authenticated user with no admin privileges

test cases done by kellen and stephen  
