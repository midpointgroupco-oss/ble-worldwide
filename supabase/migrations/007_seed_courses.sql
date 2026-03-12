-- ── SEED STANDARD COURSES FOR ALL GRADE LEVELS ──
-- We insert only if no courses exist for that grade level yet

DO $$
DECLARE
  dummy_teacher uuid := NULL;
BEGIN

-- ── 6TH GRADE ──
IF (SELECT COUNT(*) FROM public.courses WHERE grade_level = '6th') = 0 THEN
  INSERT INTO public.courses (name, subject, grade_level, teacher_id, is_active, description) VALUES
  ('English Language Arts 6',     'English',            '6th', dummy_teacher, true, 'Reading, writing, grammar, and literature for 6th graders.'),
  ('Mathematics 6',               'Mathematics',        '6th', dummy_teacher, true, 'Number systems, ratios, expressions, and geometry basics.'),
  ('Life Science',                'Science',            '6th', dummy_teacher, true, 'Biology fundamentals: cells, ecosystems, and living organisms.'),
  ('World History & Geography 6', 'Social Studies',     '6th', dummy_teacher, true, 'Ancient civilizations and world geography.'),
  ('Spanish I',                   'World Language',     '6th', dummy_teacher, true, 'Introduction to Spanish language and culture.'),
  ('Physical Education 6',        'Physical Education', '6th', dummy_teacher, true, 'Fitness, sports fundamentals, and teamwork.'),
  ('Art Foundations',             'Fine Arts',          '6th', dummy_teacher, true, 'Drawing, painting, and creative expression basics.'),
  ('Computer Applications',       'Technology',         '6th', dummy_teacher, true, 'Keyboarding, Microsoft Office, and digital citizenship.');
END IF;

-- ── 7TH GRADE ──
IF (SELECT COUNT(*) FROM public.courses WHERE grade_level = '7th') = 0 THEN
  INSERT INTO public.courses (name, subject, grade_level, teacher_id, is_active, description) VALUES
  ('English Language Arts 7',     'English',            '7th', dummy_teacher, true, 'Literature analysis, essay writing, and vocabulary.'),
  ('Pre-Algebra',                 'Mathematics',        '7th', dummy_teacher, true, 'Integers, equations, proportions, and geometry.'),
  ('Earth Science',               'Science',            '7th', dummy_teacher, true, 'Geology, weather, climate, and space.'),
  ('World History & Geography 7', 'Social Studies',     '7th', dummy_teacher, true, 'Medieval history through the Age of Exploration.'),
  ('Spanish II',                  'World Language',     '7th', dummy_teacher, true, 'Continued Spanish language and conversational skills.'),
  ('Physical Education 7',        'Physical Education', '7th', dummy_teacher, true, 'Advanced fitness and team sports.'),
  ('Band / Music',                'Fine Arts',          '7th', dummy_teacher, true, 'Instrumental music performance and theory.'),
  ('Health Education',            'Health',             '7th', dummy_teacher, true, 'Personal health, nutrition, and wellness.');
END IF;

-- ── 8TH GRADE ──
IF (SELECT COUNT(*) FROM public.courses WHERE grade_level = '8th') = 0 THEN
  INSERT INTO public.courses (name, subject, grade_level, teacher_id, is_active, description) VALUES
  ('English Language Arts 8',     'English',            '8th', dummy_teacher, true, 'Advanced reading comprehension, research writing, and grammar.'),
  ('Algebra I',                   'Mathematics',        '8th', dummy_teacher, true, 'Linear equations, functions, graphing, and inequalities.'),
  ('Physical Science',            'Science',            '8th', dummy_teacher, true, 'Chemistry and physics fundamentals.'),
  ('U.S. History',                'Social Studies',     '8th', dummy_teacher, true, 'American history from colonial times through the Civil War.'),
  ('Spanish III',                 'World Language',     '8th', dummy_teacher, true, 'Intermediate Spanish with cultural studies.'),
  ('Physical Education 8',        'Physical Education', '8th', dummy_teacher, true, 'Fitness assessment, sport strategy, and wellness.'),
  ('Drama / Theater Arts',        'Fine Arts',          '8th', dummy_teacher, true, 'Acting, script reading, and stage production basics.'),
  ('Technology & Engineering',    'Technology',         '8th', dummy_teacher, true, 'STEM projects, basic coding, and engineering design.');
END IF;

-- ── 9TH GRADE ──
IF (SELECT COUNT(*) FROM public.courses WHERE grade_level = '9th') = 0 THEN
  INSERT INTO public.courses (name, subject, grade_level, teacher_id, is_active, description) VALUES
  ('English I',                   'English',            '9th', dummy_teacher, true, 'Composition, literary analysis, and vocabulary development.'),
  ('Algebra II',                  'Mathematics',        '9th', dummy_teacher, true, 'Quadratic equations, polynomials, and functions.'),
  ('Biology',                     'Science',            '9th', dummy_teacher, true, 'Cell biology, genetics, evolution, and ecosystems.'),
  ('World History',               'Social Studies',     '9th', dummy_teacher, true, 'Global history from the Renaissance to modern times.'),
  ('Spanish IV',                  'World Language',     '9th', dummy_teacher, true, 'Advanced Spanish grammar, composition, and culture.'),
  ('Physical Education 9',        'Physical Education', '9th', dummy_teacher, true, 'Lifetime fitness and health concepts.'),
  ('Visual Art I',                'Fine Arts',          '9th', dummy_teacher, true, 'Drawing, color theory, and artistic techniques.'),
  ('Introduction to Computing',   'Technology',         '9th', dummy_teacher, true, 'Programming basics, problem solving, and digital tools.');
END IF;

-- ── 10TH GRADE ──
IF (SELECT COUNT(*) FROM public.courses WHERE grade_level = '10th') = 0 THEN
  INSERT INTO public.courses (name, subject, grade_level, teacher_id, is_active, description) VALUES
  ('English II',                  'English',            '10th', dummy_teacher, true, 'World literature, persuasive writing, and research skills.'),
  ('Geometry',                    'Mathematics',        '10th', dummy_teacher, true, 'Proofs, triangles, circles, and coordinate geometry.'),
  ('Chemistry',                   'Science',            '10th', dummy_teacher, true, 'Atomic structure, bonding, reactions, and stoichiometry.'),
  ('U.S. History & Government',   'Social Studies',     '10th', dummy_teacher, true, 'U.S. history from Reconstruction through the present.'),
  ('French I',                    'World Language',     '10th', dummy_teacher, true, 'Introduction to French language and Francophone culture.'),
  ('Health & PE 10',              'Physical Education', '10th', dummy_teacher, true, 'Mental health, nutrition, and physical fitness.'),
  ('Music Theory',                'Fine Arts',          '10th', dummy_teacher, true, 'Notation, scales, harmony, and composition basics.'),
  ('AP Computer Science Principles','Technology',       '10th', dummy_teacher, true, 'Computational thinking, algorithms, and data concepts.');
END IF;

-- ── 11TH GRADE ──
IF (SELECT COUNT(*) FROM public.courses WHERE grade_level = '11th') = 0 THEN
  INSERT INTO public.courses (name, subject, grade_level, teacher_id, is_active, description) VALUES
  ('English III (American Lit)',  'English',            '11th', dummy_teacher, true, 'American literature, rhetoric, and advanced composition.'),
  ('Pre-Calculus',                'Mathematics',        '11th', dummy_teacher, true, 'Trigonometry, functions, and preparation for calculus.'),
  ('AP Biology',                  'Science',            '11th', dummy_teacher, true, 'College-level biology with lab work and AP exam prep.'),
  ('AP U.S. History',             'Social Studies',     '11th', dummy_teacher, true, 'In-depth American history with AP exam preparation.'),
  ('French II',                   'World Language',     '11th', dummy_teacher, true, 'Intermediate French with conversation and writing focus.'),
  ('Psychology',                  'Elective',           '11th', dummy_teacher, true, 'Human behavior, cognition, and mental processes.'),
  ('AP Art History',              'Fine Arts',          '11th', dummy_teacher, true, 'Global art history from prehistory to contemporary art.'),
  ('AP Computer Science A',       'Technology',         '11th', dummy_teacher, true, 'Java programming, OOP, and AP exam preparation.');
END IF;

-- ── 12TH GRADE ──
IF (SELECT COUNT(*) FROM public.courses WHERE grade_level = '12th') = 0 THEN
  INSERT INTO public.courses (name, subject, grade_level, teacher_id, is_active, description) VALUES
  ('English IV (British Lit)',    'English',            '12th', dummy_teacher, true, 'British literature, senior thesis, and college writing.'),
  ('AP Calculus AB',              'Mathematics',        '12th', dummy_teacher, true, 'Limits, derivatives, integrals, and AP exam prep.'),
  ('AP Physics',                  'Science',            '12th', dummy_teacher, true, 'Mechanics, electricity, magnetism, and AP exam prep.'),
  ('AP Government & Politics',    'Social Studies',     '12th', dummy_teacher, true, 'U.S. and comparative government with AP exam prep.'),
  ('French III',                  'World Language',     '12th', dummy_teacher, true, 'Advanced French literature and composition.'),
  ('Economics',                   'Elective',           '12th', dummy_teacher, true, 'Micro and macroeconomics, personal finance, and markets.'),
  ('AP Studio Art',               'Fine Arts',          '12th', dummy_teacher, true, 'Portfolio development and advanced studio techniques.'),
  ('Dual Enrollment English',     'Elective',           '12th', dummy_teacher, true, 'College-credit English course for graduating seniors.');
END IF;

END $$;
