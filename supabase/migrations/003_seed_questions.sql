-- 003_seed_questions.sql
-- Complete question bank for FairSettle MVP
-- Run this after 001_create_tables.sql and 002_rls_policies.sql

-- ══════════════════════════════════════════════════════════
-- CHILD ARRANGEMENTS (dispute_type = 'child')
-- ══════════════════════════════════════════════════════════

-- Section: Living arrangements
INSERT INTO questions (dispute_type, section, question_text, question_type, options, display_order, guidance_text) VALUES
('child', 'Living arrangements', '{"en": "Where do the children currently live most of the time?"}', 'single_choice', '{"en": ["With me", "With the other parent", "Roughly equal between both homes", "Other arrangement"]}', 1, '{"en": "Courts prioritise stability for children. The current arrangement often forms the starting point for any decision."}'),
('child', 'Living arrangements', '{"en": "Where do you live?"}', 'text', NULL, 2, NULL),
('child', 'Living arrangements', '{"en": "Where does the other parent live?"}', 'text', NULL, 3, NULL),
('child', 'Living arrangements', '{"en": "How far apart do you live from each other (approximate travel time)?"}', 'single_choice', '{"en": ["Under 15 minutes", "15-30 minutes", "30-60 minutes", "1-2 hours", "More than 2 hours"]}', 4, '{"en": "Distance between homes affects the practicality of shared arrangements, particularly for school-age children."}'),
('child', 'Living arrangements', '{"en": "Are the children currently enrolled in school or nursery?"}', 'single_choice', '{"en": ["Yes - school", "Yes - nursery/childminder", "Not yet school age", "Home educated"]}', 5, NULL),
('child', 'Living arrangements', '{"en": "Which parent lives closer to the children''s school or nursery?"}', 'single_choice', '{"en": ["Me", "The other parent", "About the same distance", "Not applicable"]}', 6, '{"en": "Proximity to school is a practical factor courts consider when determining primary residence."}');

-- Section: Weekly schedule
INSERT INTO questions (dispute_type, section, question_text, question_type, options, display_order, guidance_text) VALUES
('child', 'Weekly schedule', '{"en": "How many nights per week do you want the children to stay with you?"}', 'single_choice', '{"en": ["Every night (7)", "Most nights (5-6)", "Roughly equal (3-4)", "Some nights (1-2)", "Weekends only", "As agreed flexibly"]}', 7, '{"en": "In most cases where both parents are capable, courts favour arrangements where children spend meaningful time with both. A roughly equal split or primary residence with regular overnight stays is the most common outcome."}'),
('child', 'Weekly schedule', '{"en": "What does the current weekly arrangement look like?"}', 'text', NULL, 8, NULL),
('child', 'Weekly schedule', '{"en": "Are there specific days that work better or worse for you (e.g. work commitments)?"}', 'text', NULL, 9, NULL),
('child', 'Weekly schedule', '{"en": "Do you work shifts, weekends, or have irregular hours?"}', 'single_choice', '{"en": ["No - standard weekday hours", "Yes - I work some weekends", "Yes - I work shifts", "Yes - irregular/unpredictable hours", "I am not currently working"]}', 10, NULL);

-- Section: Holidays
INSERT INTO questions (dispute_type, section, question_text, question_type, options, display_order, guidance_text) VALUES
('child', 'Holidays', '{"en": "How should school holidays be split?"}', 'single_choice', '{"en": ["50/50 equal split", "Proportional to term-time arrangement", "Alternate holidays each year", "Flexible - agree each holiday as it comes", "Other"]}', 11, '{"en": "Courts typically expect holidays to be shared fairly, often on an alternating basis for key dates like Christmas and birthdays."}'),
('child', 'Holidays', '{"en": "How should Christmas/winter holidays be handled?"}', 'single_choice', '{"en": ["Alternate years (I have Christmas Day this year, they have it next year)", "Split the holiday period (e.g. Christmas Eve with one, Christmas Day with other)", "Always with me", "Always with the other parent", "Flexible"]}', 12, NULL),
('child', 'Holidays', '{"en": "How should the children''s birthdays be handled?"}', 'single_choice', '{"en": ["With me", "With the other parent", "Alternate years", "Shared celebration together", "Flexible"]}', 13, NULL),
('child', 'Holidays', '{"en": "Do you want to take the children abroad on holiday?"}', 'single_choice', '{"en": ["Yes", "No", "Maybe in the future"]}', 14, '{"en": "Both parents with parental responsibility must consent to a child travelling abroad. A court order may be needed if consent is refused."}');

-- Section: Handovers
INSERT INTO questions (dispute_type, section, question_text, question_type, options, display_order, guidance_text) VALUES
('child', 'Handovers', '{"en": "Where should handovers take place?"}', 'single_choice', '{"en": ["At school/nursery (one drops off, the other picks up)", "At my home", "At the other parent''s home", "At a neutral location", "Other"]}', 15, '{"en": "School handovers are often preferred as they avoid direct contact between parents, which can reduce conflict."}'),
('child', 'Handovers', '{"en": "Are there any safety concerns about the other parent having unsupervised contact with the children?"}', 'single_choice', '{"en": ["No concerns", "Some concerns I would like to note", "Serious concerns - I believe contact should be supervised"]}', 16, '{"en": "If you have safeguarding concerns, the platform will signpost you to appropriate support services. Courts take child safety very seriously."}'),
('child', 'Handovers', '{"en": "If you have concerns, please briefly describe them:"}', 'text', NULL, 17, NULL);

-- Section: Decision-making
INSERT INTO questions (dispute_type, section, question_text, question_type, options, display_order, guidance_text) VALUES
('child', 'Decision-making', '{"en": "Who should make major decisions about the children''s education?"}', 'single_choice', '{"en": ["Joint decision", "Primarily me", "Primarily the other parent"]}', 18, '{"en": "Courts generally expect both parents to be involved in major decisions about a child''s upbringing, including education, medical treatment, and religious instruction."}'),
('child', 'Decision-making', '{"en": "Who should make major decisions about the children''s medical care?"}', 'single_choice', '{"en": ["Joint decision", "Primarily me", "Primarily the other parent"]}', 19, NULL),
('child', 'Decision-making', '{"en": "Who should make decisions about the children''s religious upbringing?"}', 'single_choice', '{"en": ["Joint decision", "Primarily me", "Primarily the other parent", "Not applicable"]}', 20, NULL),
('child', 'Decision-making', '{"en": "How do you currently communicate with the other parent?"}', 'multi_choice', '{"en": ["WhatsApp/text", "Phone calls", "Email", "Through a third party", "We don''t communicate", "Through solicitors"]}', 21, NULL);

-- ══════════════════════════════════════════════════════════
-- FINANCIAL DISPUTES (dispute_type = 'financial')
-- ══════════════════════════════════════════════════════════

-- Section: Income
INSERT INTO questions (dispute_type, section, question_text, question_type, options, display_order, guidance_text) VALUES
('financial', 'Income', '{"en": "What is your gross annual income (before tax)?"}', 'number', NULL, 1, '{"en": "Income is a key factor in financial settlements and child maintenance calculations. The CMS uses gross income as the starting point."}'),
('financial', 'Income', '{"en": "What is your net monthly income (take-home pay)?"}', 'number', NULL, 2, NULL),
('financial', 'Income', '{"en": "What is your employment type?"}', 'single_choice', '{"en": ["Employed full-time", "Employed part-time", "Self-employed", "Company director", "Unemployed", "Retired", "On benefits"]}', 3, NULL),
('financial', 'Income', '{"en": "Do you receive any of the following?"}', 'multi_choice', '{"en": ["Child Benefit", "Universal Credit", "Tax Credits", "Housing Benefit", "Disability benefits", "Pension income", "Rental income", "None of the above"]}', 4, NULL),
('financial', 'Income', '{"en": "What is the other parent''s approximate gross annual income (if known)?"}', 'number', NULL, 5, '{"en": "If you don''t know the exact figure, provide your best estimate. The comparison view will highlight any significant discrepancy between declared incomes."}');

-- Section: Property
INSERT INTO questions (dispute_type, section, question_text, question_type, options, display_order, guidance_text) VALUES
('financial', 'Property', '{"en": "Do you jointly own a property?"}', 'single_choice', '{"en": ["Yes - jointly owned", "Yes - in my name only", "Yes - in the other parent''s name only", "No - we rent", "No - we don''t share a home"]}', 6, NULL),
('financial', 'Property', '{"en": "What is the approximate current value of the property?"}', 'number', NULL, 7, '{"en": "If unsure, check recent sold prices for similar properties in your area on Rightmove or Zoopla."}'),
('financial', 'Property', '{"en": "What is the outstanding mortgage balance?"}', 'number', NULL, 8, NULL),
('financial', 'Property', '{"en": "What do you think should happen with the property?"}', 'single_choice', '{"en": ["Sell and split the equity", "I buy out the other parent''s share", "The other parent buys out my share", "One of us stays until children are 18, then sell", "Other"]}', 9, '{"en": "Courts consider the housing needs of both parties and the children. The parent with primary care of children often receives a larger share or the right to remain in the home."}');

-- Section: Savings and assets
INSERT INTO questions (dispute_type, section, question_text, question_type, options, display_order, guidance_text) VALUES
('financial', 'Savings and assets', '{"en": "What is the approximate total value of your savings (all bank accounts, ISAs, etc.)?"}', 'number', NULL, 10, NULL),
('financial', 'Savings and assets', '{"en": "Do you have any investments (shares, bonds, crypto)?"}', 'single_choice', '{"en": ["Yes", "No"]}', 11, NULL),
('financial', 'Savings and assets', '{"en": "If yes, approximate total value of investments:"}', 'number', NULL, 12, NULL),
('financial', 'Savings and assets', '{"en": "What is the approximate total value of your pension(s)?"}', 'number', NULL, 13, '{"en": "Pensions are often one of the largest assets in a financial settlement. Courts can order pension sharing, offsetting, or earmarking."}'),
('financial', 'Savings and assets', '{"en": "What type of pension do you have?"}', 'multi_choice', '{"en": ["Defined contribution (money purchase)", "Defined benefit (final salary)", "State pension only", "No pension", "Don''t know"]}', 14, NULL);

-- Section: Debts
INSERT INTO questions (dispute_type, section, question_text, question_type, options, display_order, guidance_text) VALUES
('financial', 'Debts', '{"en": "Do you have any joint debts?"}', 'single_choice', '{"en": ["Yes", "No"]}', 15, NULL),
('financial', 'Debts', '{"en": "If yes, what are the joint debts? (Select all that apply)"}', 'multi_choice', '{"en": ["Joint mortgage", "Joint loan", "Joint credit card", "Joint overdraft", "Other joint debt"]}', 16, NULL),
('financial', 'Debts', '{"en": "Total approximate value of joint debts (excluding mortgage):"}', 'number', NULL, 17, NULL),
('financial', 'Debts', '{"en": "Do you have individual debts the other parent may not know about?"}', 'single_choice', '{"en": ["Yes", "No"]}', 18, '{"en": "Full financial disclosure is expected in any settlement. Non-disclosure can result in a settlement being set aside by the court."}'),
('financial', 'Debts', '{"en": "If yes, approximate total of your individual debts:"}', 'number', NULL, 19, NULL);

-- Section: Child maintenance
INSERT INTO questions (dispute_type, section, question_text, question_type, options, display_order, guidance_text) VALUES
('financial', 'Child maintenance', '{"en": "What monthly child maintenance amount do you think is fair?"}', 'number', NULL, 20, '{"en": "The CMS basic rate is 12% of gross income for 1 child, 16% for 2 children, and 19% for 3+. This is reduced if the paying parent has the children overnight regularly."}'),
('financial', 'Child maintenance', '{"en": "Are there additional costs you think should be shared? (Select all that apply)"}', 'multi_choice', '{"en": ["School fees", "Childcare/nursery", "Extracurricular activities", "School uniform/equipment", "Medical/dental costs", "None"]}', 21, NULL),
('financial', 'Child maintenance', '{"en": "What do you think a fair overall financial split would be?"}', 'single_choice', '{"en": ["50/50 equal", "60/40 in my favour", "60/40 in their favour", "70/30 in my favour", "70/30 in their favour", "Other"]}', 22, '{"en": "Courts consider many factors including: length of marriage, income and earning capacity of each party, needs of any children, contributions (financial and non-financial), and standard of living during the marriage."}');

-- Section: Monthly outgoings
INSERT INTO questions (dispute_type, section, question_text, question_type, options, display_order, guidance_text) VALUES
('financial', 'Monthly outgoings', '{"en": "What is your approximate monthly rent or mortgage payment?"}', 'number', NULL, 23, NULL),
('financial', 'Monthly outgoings', '{"en": "What are your approximate total monthly living costs (bills, food, transport, insurance)?"}', 'number', NULL, 24, NULL),
('financial', 'Monthly outgoings', '{"en": "Do you have any significant upcoming financial commitments?"}', 'text', NULL, 25, NULL);

-- ══════════════════════════════════════════════════════════
-- ASSET SPLIT (dispute_type = 'asset')
-- ══════════════════════════════════════════════════════════

-- Section: Property
INSERT INTO questions (dispute_type, section, question_text, question_type, options, display_order, guidance_text) VALUES
('asset', 'Property', '{"en": "Have you agreed on the current market value of the property?"}', 'single_choice', '{"en": ["Yes - we agree on the value", "No - we disagree on the value", "We need a professional valuation", "Not applicable"]}', 1, '{"en": "If you disagree on value, an independent RICS valuation (typically £300-500) provides an objective figure that courts accept."}'),
('asset', 'Property', '{"en": "What do you believe the property is worth?"}', 'number', NULL, 2, NULL),
('asset', 'Property', '{"en": "What is the outstanding mortgage?"}', 'number', NULL, 3, NULL),
('asset', 'Property', '{"en": "Who is on the title deeds?"}', 'single_choice', '{"en": ["Both of us", "Only me", "Only the other parent"]}', 4, NULL),
('asset', 'Property', '{"en": "What is your preferred outcome for the property?"}', 'single_choice', '{"en": ["Sell on the open market and split proceeds", "I buy out the other parent", "The other parent buys me out", "Transfer to me (offset against other assets)", "Transfer to them (offset against other assets)", "Mesher order (deferred sale until children are 18)"]}', 5, '{"en": "A Mesher order delays the sale of the home, typically until the youngest child turns 18 or finishes education. This protects the children''s stability but delays one parent''s access to their share."}'),
('asset', 'Property', '{"en": "What percentage split of the property equity do you think is fair?"}', 'single_choice', '{"en": ["50/50", "55/45 in my favour", "55/45 in their favour", "60/40 in my favour", "60/40 in their favour", "70/30 in my favour", "70/30 in their favour", "Other"]}', 6, NULL);

-- Section: Vehicles and contents
INSERT INTO questions (dispute_type, section, question_text, question_type, options, display_order, guidance_text) VALUES
('asset', 'Vehicles and contents', '{"en": "Are there any vehicles to divide?"}', 'single_choice', '{"en": ["Yes", "No"]}', 7, NULL),
('asset', 'Vehicles and contents', '{"en": "If yes, list vehicles and who you think should keep each:"}', 'text', NULL, 8, NULL),
('asset', 'Vehicles and contents', '{"en": "Are there any high-value household contents in dispute (furniture, jewellery, art, electronics)?"}', 'single_choice', '{"en": ["Yes", "No"]}', 9, NULL),
('asset', 'Vehicles and contents', '{"en": "If yes, please list the items and your preferred outcome:"}', 'text', NULL, 10, NULL);

-- Section: Business interests
INSERT INTO questions (dispute_type, section, question_text, question_type, options, display_order, guidance_text) VALUES
('asset', 'Business interests', '{"en": "Does either parent own or part-own a business?"}', 'single_choice', '{"en": ["Yes - I do", "Yes - the other parent does", "Yes - we both have business interests", "No"]}', 11, '{"en": "Business assets are included in financial settlements. Valuation may require an independent accountant."}'),
('asset', 'Business interests', '{"en": "If yes, what is the approximate value of the business interest?"}', 'number', NULL, 12, NULL),
('asset', 'Business interests', '{"en": "Should the business be included in the asset split?"}', 'single_choice', '{"en": ["Yes - it should be valued and included", "No - it should be excluded (pre-marital asset)", "I''m not sure"]}', 13, NULL);

-- Section: Pensions
INSERT INTO questions (dispute_type, section, question_text, question_type, options, display_order, guidance_text) VALUES
('asset', 'Pensions', '{"en": "What is the approximate total value of your pension(s)?"}', 'number', NULL, 14, NULL),
('asset', 'Pensions', '{"en": "What is the approximate total value of the other parent''s pension(s) (if known)?"}', 'number', NULL, 15, NULL),
('asset', 'Pensions', '{"en": "What do you think should happen with pensions?"}', 'single_choice', '{"en": ["Share them equally (pension sharing order)", "Offset against other assets (e.g. I keep more of the house, they keep their pension)", "Each keep their own pension", "I''m not sure"]}', 16, '{"en": "Pension sharing orders split the pension at source. Offsetting gives one party a larger share of another asset (like the house) instead of a share of the pension. Courts consider the total asset picture."}');
