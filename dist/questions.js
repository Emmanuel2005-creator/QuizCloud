/* Each row: question, correct answer, three distractors, explanation.
   Game preparation shuffles both the questions and the answer positions. */
(function (root) {
  'use strict';
  const categories = [
    { id: 'sports', name: 'Sports', icon: 'sports', color: '#be8934', tint: '#fff5e5', description: 'Big games. Legendary moments. How well do you know sports?' },
    { id: 'technology', name: 'Technology', icon: 'tech', color: '#7161d5', tint: '#f0ecff', description: 'From bytes to breakthroughs. Put your tech brain to work.' },
    { id: 'geography', name: 'Geography', icon: 'globe', color: '#389b81', tint: '#e9f7f1', description: 'A world of questions. How far can your knowledge take you?' },
    { id: 'movies', name: 'Movies', icon: 'movies', color: '#cf718b', tint: '#fff0f4', description: 'Lights, camera, trivia. This is your main character moment.' }
  ];
  const rows = {
    sports: [
      ['How many players does a soccer team have on the field at the start of a match?', '11', '9', '10', '12', 'Each soccer team starts with 11 players, including the goalkeeper.'],
      ['In tennis, what word means a score of zero?', 'Love', 'Nil', 'Blank', 'Duck', 'A tennis score of zero is called love.'],
      ['Which sport uses a shuttlecock?', 'Badminton', 'Squash', 'Table tennis', 'Lacrosse', 'Badminton players hit a shuttlecock over a net.'],
      ['How many rings are on the Olympic symbol?', 'Five', 'Four', 'Six', 'Seven', 'The Olympic symbol has five interlocking rings.'],
      ['Which country hosted the 2016 Summer Olympics?', 'Brazil', 'Japan', 'Greece', 'China', 'Rio de Janeiro, Brazil, hosted the 2016 Summer Olympics.'],
      ['In basketball, how many points is a free throw worth?', 'One', 'Two', 'Three', 'Four', 'A successful free throw scores one point.'],
      ['Which sport is played at Wimbledon?', 'Tennis', 'Cricket', 'Golf', 'Rugby', 'Wimbledon is a grass-court tennis championship in London.'],
      ['What is the standard marathon distance?', '42.195 kilometers', '40 kilometers', '26 kilometers', '50 kilometers', 'A marathon is 42.195 kilometers, or about 26.2 miles.'],
      ['In golf, what is one stroke under par called?', 'Birdie', 'Bogey', 'Eagle', 'Albatross', 'A birdie is one stroke under par; an eagle is two under par.'],
      ['How many bases, including home plate, are on a baseball diamond?', 'Four', 'Three', 'Five', 'Six', 'The diamond has first, second, and third base, plus home plate.'],
      ['Which swimming stroke is named after an insect?', 'Butterfly', 'Dragonfly', 'Beetle', 'Cricket', 'Butterfly uses a simultaneous arm movement and a dolphin kick.'],
      ['Which country won the 2022 men’s FIFA World Cup?', 'Argentina', 'France', 'Brazil', 'Germany', 'Argentina defeated France in a penalty shootout in the 2022 final.'],
      ['In which sport would you perform a slam dunk?', 'Basketball', 'Volleyball', 'Handball', 'Water polo', 'A slam dunk sends the basketball down through the hoop from above.'],
      ['Which sport awards the Stanley Cup?', 'Ice hockey', 'Baseball', 'American football', 'Basketball', 'The Stanley Cup is awarded to the NHL playoff champion.'],
      ['How many events make up a decathlon?', 'Ten', 'Eight', 'Twelve', 'Five', 'A decathlon combines ten track-and-field events.'],
      ['Which piece can jump over other pieces in chess?', 'Knight', 'Bishop', 'Rook', 'Queen', 'The knight moves in an L shape and can jump over pieces.'],
      ['In cricket, what is a score of 100 runs by one batter called?', 'Century', 'Hat-trick', 'Triple', 'Grand slam', 'A batter who scores 100 runs in an innings has made a century.'],
      ['The Tour de France is associated with which sport?', 'Cycling', 'Running', 'Skiing', 'Rowing', 'The Tour de France is a multi-stage road cycling race.'],
      ['How many points is a touchdown worth before any extra attempt?', 'Six', 'Three', 'Seven', 'Eight', 'A touchdown scores six points in American football.'],
      ['In which sport is the term “ippon” used?', 'Judo', 'Fencing', 'Archery', 'Boxing', 'An ippon is a full-point score that wins a judo contest.']
    ],
    technology: [
      ['What does CPU stand for?', 'Central Processing Unit', 'Computer Power Utility', 'Central Program Upload', 'Core Peripheral Unit', 'The Central Processing Unit executes program instructions.'],
      ['Which language defines the structure of a web page?', 'HTML', 'CSS', 'SQL', 'Bash', 'HTML describes a page’s structure and semantic content.'],
      ['What does CSS primarily control on a website?', 'Visual styling', 'Database queries', 'Domain registration', 'Server encryption', 'CSS controls presentation, including colors, spacing, and layout.'],
      ['Which number system uses only 0 and 1?', 'Binary', 'Decimal', 'Hexadecimal', 'Octal', 'Binary is a base-two number system.'],
      ['What does RAM stand for?', 'Random Access Memory', 'Read Archive Module', 'Remote Application Manager', 'Rapid Arithmetic Machine', 'Random Access Memory stores working data for fast access.'],
      ['Which protocol adds encryption to HTTP?', 'HTTPS', 'FTP', 'SMTP', 'DHCP', 'HTTPS secures HTTP communication using TLS encryption.'],
      ['What is the main purpose of DNS?', 'Translate domain names into IP addresses', 'Compress image files', 'Charge batteries', 'Compile source code', 'DNS lets a human-readable domain name resolve to an IP address.'],
      ['Who created the Python programming language?', 'Guido van Rossum', 'Tim Berners-Lee', 'Dennis Ritchie', 'James Gosling', 'Guido van Rossum created Python, first released in 1991.'],
      ['What does an HTTP 404 status code mean?', 'Not found', 'Request succeeded', 'Server overloaded', 'Moved permanently', '404 indicates that the server could not find the requested resource.'],
      ['Which tool is a distributed version control system?', 'Git', 'Docker', 'Nginx', 'Figma', 'Git tracks changes and supports distributed development workflows.'],
      ['Which cloud service model provides virtual machines and networking?', 'Infrastructure as a Service', 'Software as a Service', 'Desktop publishing', 'Email as a Service', 'IaaS provides infrastructure such as compute, storage, and networking.'],
      ['What does an SSD use to store data?', 'Flash memory', 'Magnetic tape', 'Optical discs', 'Punched cards', 'Solid-state drives typically store data in NAND flash memory.'],
      ['What is the main purpose of a firewall?', 'Filter network traffic', 'Increase screen brightness', 'Render video', 'Format documents', 'Firewalls allow or block network traffic according to rules.'],
      ['Which language runs natively in web browsers to add interactivity?', 'JavaScript', 'C++', 'Ruby', 'Go', 'Browsers include JavaScript engines to run interactive website code.'],
      ['What does SQL stand for?', 'Structured Query Language', 'System Queue Logic', 'Secure Quality Link', 'Sequential Query List', 'SQL is used to query and manage relational databases.'],
      ['What does a load balancer do?', 'Distribute requests across servers', 'Encrypt a hard drive', 'Design website logos', 'Register domain names', 'A load balancer spreads incoming requests across available servers.'],
      ['What is a byte usually made of?', 'Eight bits', 'Two bits', 'Four bits', 'Sixteen bits', 'A byte is conventionally eight bits.'],
      ['What does API stand for?', 'Application Programming Interface', 'Automated Processing Internet', 'Advanced Peripheral Input', 'Application Privacy Index', 'An API defines how software components can interact.'],
      ['Which practice adds an extra verification step when signing in?', 'Multi-factor authentication', 'File compression', 'Disk partitioning', 'Code minification', 'Multi-factor authentication uses more than one kind of identity evidence.'],
      ['Which data format uses key-value pairs and is common in web APIs?', 'JSON', 'JPEG', 'MP3', 'GIF', 'JavaScript Object Notation is a text format commonly used for API data.']
    ],
    geography: [
      ['What is the capital of Japan?', 'Tokyo', 'Kyoto', 'Osaka', 'Seoul', 'Tokyo is the capital of Japan; Kyoto was a historic imperial capital.'],
      ['Which is the largest ocean on Earth?', 'Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'The Pacific is the largest ocean by surface area.'],
      ['On which continent is the Sahara Desert?', 'Africa', 'Asia', 'Australia', 'South America', 'The Sahara stretches across North Africa.'],
      ['Which country is home to the city of Machu Picchu?', 'Peru', 'Mexico', 'Chile', 'Colombia', 'Machu Picchu is an Inca site in the Peruvian Andes.'],
      ['What is the capital of Canada?', 'Ottawa', 'Toronto', 'Vancouver', 'Montreal', 'Ottawa, in Ontario, is Canada’s capital.'],
      ['Which imaginary line divides Earth into Northern and Southern Hemispheres?', 'Equator', 'Prime Meridian', 'Tropic of Cancer', 'Arctic Circle', 'The Equator is at zero degrees latitude.'],
      ['Which country has a boot-shaped peninsula?', 'Italy', 'Portugal', 'Greece', 'Norway', 'The Italian Peninsula is famous for its boot-like outline.'],
      ['Which mountain has the highest summit above sea level?', 'Mount Everest', 'K2', 'Kilimanjaro', 'Mont Blanc', 'Mount Everest’s summit is the highest above sea level.'],
      ['Which river flows through Paris?', 'Seine', 'Thames', 'Danube', 'Rhine', 'The Seine flows through the center of Paris.'],
      ['Which country is the largest by land area?', 'Russia', 'Canada', 'China', 'United States', 'Russia has the largest land area of any country.'],
      ['Which continent has no permanent native human population?', 'Antarctica', 'Europe', 'Australia', 'Asia', 'Antarctica hosts research communities but has no permanent native human population.'],
      ['Which country contains the Great Barrier Reef?', 'Australia', 'Indonesia', 'Philippines', 'New Zealand', 'The Great Barrier Reef lies off Queensland, Australia.'],
      ['What is the capital of Egypt?', 'Cairo', 'Alexandria', 'Luxor', 'Rabat', 'Cairo is Egypt’s capital and lies along the Nile.'],
      ['Which sea lies between Europe and northern Africa?', 'Mediterranean Sea', 'Caribbean Sea', 'Baltic Sea', 'Arabian Sea', 'The Mediterranean separates southern Europe from northern Africa.'],
      ['Which country is home to the Taj Mahal?', 'India', 'Pakistan', 'Bangladesh', 'Nepal', 'The Taj Mahal is in Agra, India.'],
      ['What is the largest island in the world, excluding continents?', 'Greenland', 'Madagascar', 'Borneo', 'Iceland', 'Greenland is the largest island when continental landmasses are excluded.'],
      ['Which city is in both Europe and Asia?', 'Istanbul', 'Madrid', 'Lisbon', 'Vienna', 'Istanbul spans the Bosporus, connecting its European and Asian sides.'],
      ['Which country has Wellington as its capital?', 'New Zealand', 'Australia', 'Fiji', 'Samoa', 'Wellington is the capital of New Zealand.'],
      ['Which desert covers much of Mongolia and northern China?', 'Gobi', 'Atacama', 'Kalahari', 'Mojave', 'The Gobi stretches across parts of Mongolia and China.'],
      ['Which U.S. state is made up entirely of islands?', 'Hawaii', 'Alaska', 'Florida', 'California', 'Hawaii is an island chain in the Pacific Ocean.']
    ],
    movies: [
      ['Who directed the 1993 film Jurassic Park?', 'Steven Spielberg', 'James Cameron', 'George Lucas', 'Ridley Scott', 'Steven Spielberg directed Jurassic Park, based on Michael Crichton’s novel.'],
      ['In The Matrix, which pill does Neo take?', 'Red', 'Blue', 'Green', 'White', 'Neo takes the red pill to learn the truth about the Matrix.'],
      ['Which studio made Toy Story?', 'Pixar', 'DreamWorks', 'Studio Ghibli', 'Aardman', 'Pixar made Toy Story, released in 1995.'],
      ['What is the name of the lion cub in The Lion King?', 'Simba', 'Mufasa', 'Scar', 'Timon', 'Simba grows from a young cub into the king of the Pride Lands.'],
      ['Which film features the line “I’ll be back”?', 'The Terminator', 'Die Hard', 'RoboCop', 'Predator', 'Arnold Schwarzenegger delivers the line in The Terminator.'],
      ['Who plays Jack Dawson in Titanic?', 'Leonardo DiCaprio', 'Brad Pitt', 'Matt Damon', 'Johnny Depp', 'Leonardo DiCaprio plays Jack opposite Kate Winslet’s Rose.'],
      ['What is the name of the hobbit played by Elijah Wood in The Lord of the Rings?', 'Frodo Baggins', 'Bilbo Baggins', 'Samwise Gamgee', 'Peregrin Took', 'Elijah Wood portrays Frodo, the central Ring-bearer.'],
      ['Which film features a clownfish named Nemo?', 'Finding Nemo', 'Shark Tale', 'The Little Mermaid', 'Moana', 'Finding Nemo follows Marlin’s search for his son, Nemo.'],
      ['Who directed Spirited Away?', 'Hayao Miyazaki', 'Akira Kurosawa', 'Satoshi Kon', 'Makoto Shinkai', 'Hayao Miyazaki directed Spirited Away for Studio Ghibli.'],
      ['Which fictional metal is associated with Black Panther’s homeland?', 'Vibranium', 'Adamantium', 'Kryptonite', 'Unobtainium', 'Wakanda is known for its deposits of vibranium.'],
      ['In Back to the Future, what car becomes a time machine?', 'DeLorean', 'Ford Mustang', 'Chevrolet Corvette', 'Volkswagen Beetle', 'Doc Brown builds his time machine into a DeLorean.'],
      ['Which movie features the song “Let It Go”?', 'Frozen', 'Tangled', 'Brave', 'Encanto', 'Elsa sings “Let It Go” in Disney’s Frozen.'],
      ['What is the name of the hotel in The Shining?', 'Overlook Hotel', 'Bates Motel', 'Grand Budapest Hotel', 'Continental Hotel', 'The Shining is set at the isolated Overlook Hotel.'],
      ['Which actor portrays Iron Man in the 2008 film?', 'Robert Downey Jr.', 'Chris Evans', 'Mark Ruffalo', 'Chris Hemsworth', 'Robert Downey Jr. plays Tony Stark, also known as Iron Man.'],
      ['Which film won Best Picture at the 2020 Academy Awards?', 'Parasite', '1917', 'Joker', 'Once Upon a Time in Hollywood', 'Parasite won Best Picture at the 2020 ceremony.'],
      ['Which Star Wars character says “Do. Or do not. There is no try.”?', 'Yoda', 'Obi-Wan Kenobi', 'Darth Vader', 'Han Solo', 'Yoda gives this advice to Luke in The Empire Strikes Back.'],
      ['Which movie is set on the moon Pandora?', 'Avatar', 'Interstellar', 'Dune', 'The Martian', 'James Cameron’s Avatar is set on the fictional moon Pandora.'],
      ['What kind of animal is Po in Kung Fu Panda?', 'Giant panda', 'Red panda', 'Polar bear', 'Koala', 'Po is a giant panda who becomes the Dragon Warrior.'],
      ['Which film follows a robot named WALL-E?', 'WALL-E', 'Big Hero 6', 'Robots', 'The Iron Giant', 'Pixar’s WALL-E follows a waste-collecting robot on a largely abandoned Earth.'],
      ['Who composed the music for the original Star Wars film?', 'John Williams', 'Hans Zimmer', 'Howard Shore', 'Danny Elfman', 'John Williams composed the score for the original 1977 Star Wars film.']
    ]
  };
  const questions = Object.fromEntries(Object.entries(rows).map(([category, items]) => [category,
    items.map((row, i) => ({ id: `${category}-${i + 1}`, question: row[0], options: row.slice(1, 5), correct: 0, explanation: row[5] }))
  ]));
  const data = { categories, questions };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.QuizData = data;
})(typeof globalThis !== 'undefined' ? globalThis : this);
