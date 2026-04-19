INSERT INTO users
    (username, password)
VALUES
    ('user0', '$2a$10$E.Nq8oyJqsqC45g.38Rkj.Wvgya2p1PBH/LM4F1scBxXgbTrRlASG');

INSERT INTO jokes 
    (author, content, censored_content, tags)
VALUES
    ('user0', 'Why don''t scientists trust atoms? Because they make up everything.', 'Why don''t scientists trust atoms? Because they make up everything.', 'science,puns'),
    ('user0', 'I told my wife she was drawing her eyebrows too high. She looked surprised.', 'I told my wife she was drawing her eyebrows too high. She looked surprised.', 'puns,relationships'),
    ('user0', 'What do you call a fake noodle? An impasta.', 'What do you call a fake noodle? An impasta.', 'food,puns'),
    ('user0', 'Why did the scarecrow win an award? Because he was outstanding in his field.', 'Why did the scarecrow win an award? Because he was outstanding in his field.', 'wordplay,puns'),
    ('user0', 'I''m reading a book about anti-gravity. It''s impossible to put down.', 'I''m reading a book about anti-gravity. It''s impossible to put down.', 'books,puns'),
    ('user0', 'Did you hear about the mathematician who''s afraid of negative numbers? He''ll stop at nothing to avoid them.', 'Did you hear about the mathematician who''s afraid of negative numbers? He''ll stop at nothing to avoid them.', 'math,puns'),
    ('user0', 'Why did the dipshit cross the road? Because he was too dumb to know he shouldn''t.', 'Why did the ******* cross the road? Because he was too **** to know he shouldn''t.', 'wordplay,dark'),
    ('user0', 'I used to hate facial hair, but then it grew on me.', 'I used to hate facial hair, but then it grew on me.', 'puns,wordplay'),
    ('user0', 'What do you call cheese that isn''t yours? Nacho cheese.', 'What do you call cheese that isn''t yours? Nacho cheese.', 'food,puns'),
    ('user0', 'Why did the bicycle fall over? Because it was two-tired.', 'Why did the bicycle fall over? Because it was two-tired.', 'puns,wordplay');

INSERT INTO joke_reports 
    (joke_id, reporter_username, reason, details) 
VALUES
    (7, 'user0', 'offensive', 'This joke contains inappropriate language.');