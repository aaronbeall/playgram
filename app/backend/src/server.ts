import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { User, Team, Goal, Task, Reward, Event, GoalMember } from '../../shared/types/apiTypes';

const app = express();
const PORT = process.env.PORT || 5000;

// Open database connection
const dbPromise = open({
  filename: './playgrams.db',
  driver: sqlite3.Database
});

// Initialize database tables
(async () => {
  const db = await dbPromise;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      profilePic TEXT,
      bio TEXT,
      status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS Teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      isPublic BOOLEAN NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      isPublic BOOLEAN NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      isPublic BOOLEAN NOT NULL,
      goalId INTEGER,
      FOREIGN KEY (goalId) REFERENCES Goals(id)
    );

    CREATE TABLE IF NOT EXISTS Rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      isPublic BOOLEAN NOT NULL,
      goalId INTEGER,
      FOREIGN KEY (goalId) REFERENCES Goals(id)
    );

    CREATE TABLE IF NOT EXISTS TeamMembers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teamId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
      FOREIGN KEY (teamId) REFERENCES Teams(id),
      FOREIGN KEY (userId) REFERENCES Users(id)
    );

    CREATE TABLE IF NOT EXISTS UserGoals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      goalId INTEGER NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
      FOREIGN KEY (userId) REFERENCES Users(id),
      FOREIGN KEY (goalId) REFERENCES Goals(id)
    );

    CREATE TABLE IF NOT EXISTS UserTasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      taskId INTEGER NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
      FOREIGN KEY (userId) REFERENCES Users(id),
      FOREIGN KEY (taskId) REFERENCES Tasks(id)
    );

    CREATE TABLE IF NOT EXISTS TeamGoals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teamId INTEGER NOT NULL,
      goalId INTEGER NOT NULL,
      FOREIGN KEY (teamId) REFERENCES Teams(id),
      FOREIGN KEY (goalId) REFERENCES Goals(id)
    );

    CREATE TABLE IF NOT EXISTS TaskRewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taskId INTEGER NOT NULL,
      rewardId INTEGER NOT NULL,
      FOREIGN KEY (taskId) REFERENCES Tasks(id),
      FOREIGN KEY (rewardId) REFERENCES Rewards(id)
    );

    CREATE TABLE IF NOT EXISTS Events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      userId INTEGER,
      teamId INTEGER,
      goalId INTEGER,
      taskId INTEGER,
      rewardId INTEGER,
      FOREIGN KEY (userId) REFERENCES Users(id),
      FOREIGN KEY (teamId) REFERENCES Teams(id),
      FOREIGN KEY (goalId) REFERENCES Goals(id),
      FOREIGN KEY (taskId) REFERENCES Tasks(id),
      FOREIGN KEY (rewardId) REFERENCES Rewards(id)
    );

    CREATE TABLE IF NOT EXISTS Friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      friendId INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('requested', 'accepted', 'blocked')),
      FOREIGN KEY (userId) REFERENCES Users(id),
      FOREIGN KEY (friendId) REFERENCES Users(id)
    );
  `);

  console.log('Database schema initialized');
})();

// Add initial data for testing purposes
(async () => {
  const db = await dbPromise;

  // Insert initial user
  await db.run(`INSERT OR IGNORE INTO Users (id, name, email, profilePic, bio, status) VALUES (1, 'Test User', 'testuser@example.com', 'https://example.com/profile.jpg', 'This is a test user.', 'active');`);

  // Insert initial team
  await db.run(`INSERT OR IGNORE INTO Teams (id, name, isPublic) VALUES (1, 'Test Team', 1);`);

  // Insert initial goal
  await db.run(`INSERT OR IGNORE INTO Goals (id, title, description, isPublic) VALUES (1, 'Test Goal', 'This is a test goal.', 1);`);

  // Insert initial task with goalId for the initial goal
  await db.run(`INSERT OR IGNORE INTO Tasks (id, title, description, isPublic, goalId) VALUES (1, 'Test Task', 'This is a test task.', 1, 1);`);

  console.log('Initial test data inserted');
})();

// Add user goal, user task, and reward for testing purposes
(async () => {
  const db = await dbPromise;

  // Assign the test user to the test goal
  await db.run(`INSERT OR IGNORE INTO UserGoals (userId, goalId, role) VALUES (1, 1, 'owner');`);

  // Assign the test user to the test task
  await db.run(`INSERT OR IGNORE INTO UserTasks (userId, taskId, role) VALUES (1, 1, 'owner');`);

  // Insert initial reward
  await db.run(`INSERT OR IGNORE INTO Rewards (id, title, description, isPublic) VALUES (1, 'Test Reward', 'This is a test reward.', 1);`);

  // Link the reward to the test task
  await db.run(`INSERT OR IGNORE INTO TaskRewards (taskId, rewardId) VALUES (1, 1);`);

  console.log('Test user goal, user task, and reward added');
})();

// Middleware
app.use(bodyParser.json());
app.use(cors());

declare global {
    namespace Express {
      interface Request {
        user?: { id: number; email: string };
      }
    }
  }

/**
 * @route GET /
 * @description Welcome message for the API
 * @response {string} Welcome message
 */
app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to the Playgrams API!');
});

/**
 * @route POST /auth/login
 * @description Authenticate a user and return a JWT token
 * @param {object} body - The request body
 * @param {string} body.email - The user's email
 * @param {string} body.name - The user's name
 * @response {object} user - The authenticated user object
 * @response {string} token - The JWT token
 */
app.post('/auth/login', async (req: Request<{}, {}, { email: string; name: string }>, res: Response<{ token: string; user: User } | { error: string }>) => {
  const { email, name } = req.body;

  try {
    const db = await dbPromise;
    let user = await db.get('SELECT * FROM Users WHERE email = ?', [email]);

    if (!user) {
      const result = await db.run('INSERT INTO Users (name, email) VALUES (?, ?)', [name, email]);
      user = { id: result.lastID ?? 0, name, email };
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, 'secretKey', { expiresIn: '1h' });

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to authenticate user' });
  }
});

// Middleware to verify JWT
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, 'secretKey') as { id: number; email: string };
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Forbidden' });
  }
};

/**
 * @route GET /auth/profile
 * @description Get the authenticated user's profile
 * @header {string} Authorization - Bearer token
 * @response {object} user - The user's profile
 */
app.get('/auth/profile', authenticate, async (req: Request, res: Response<User | { error: string }>) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = await dbPromise;
    const user = await db.get('SELECT * FROM Users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

/**
 * @route POST /users
 * @description Create a new user
 * @param {object} body - The request body
 * @param {string} body.name - The user's name
 * @param {string} body.email - The user's email
 * @response {object} user - The created user object
 */
app.post('/users', async (req: Request<{}, {}, { name: string; email: string }>, res: Response<User | { error: string }>) => {
  const { name, email } = req.body;
  try {
    const db = await dbPromise;
    const result = await db.run('INSERT INTO Users (name, email) VALUES (?, ?)', [name, email]);
    res.status(201).json({ id: result.lastID ?? 0, name, email, createdAt: Date.now(), friends: [], teams: [], goals: [], tasks: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * @route GET /users
 * @description Get all users
 * @response {array} users - List of all users
 */
app.get('/users', async (req: Request, res: Response<User[] | { error: string }>) => {
  try {
    const db = await dbPromise;
    const users = await db.all('SELECT * FROM Users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * @route POST /teams
 * @description Create a new team
 * @param {object} body - The request body
 * @param {string} body.name - The team's name
 * @response {object} team - The created team object
 */
app.post('/teams', authenticate, async (req: Request<{}, {}, { name: string }>, res: Response<Team | { error: string }>) => {
  const { name } = req.body;
  try {
    const db = await dbPromise;
    const result = await db.run('INSERT INTO Teams (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.lastID ?? 0, name, isPublic: false, createdAt: Date.now(), members: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create team' });
  }
});

/**
 * @route GET /teams
 * @description Get all teams
 * @response {array} teams - List of all teams
 */
app.get('/teams', authenticate, async (req: Request, res: Response<Team[] | { error: string }>) => {
  try {
    const db = await dbPromise;
    const teams = await db.all('SELECT * FROM Teams');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

/**
 * @route POST /goals
 * @description Create a new goal
 * @param {object} body - The request body
 * @param {string} body.title - The goal's title
 * @param {string} body.description - The goal's description
 * @param {boolean} body.isPublic - Whether the goal is public
 * @response {object} goal - The created goal object
 */
app.post('/goals', authenticate, async (req: Request<{}, {}, { title: string; description: string; isPublic: boolean }>, res: Response<Goal | { error: string }>) => {
  const { title, description, isPublic } = req.body;
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = await dbPromise;
    const result = await db.run('INSERT INTO Goals (title, description, isPublic) VALUES (?, ?, ?)', [title, description, isPublic]);
    const goalId = result.lastID ?? 0;

    // Add the user as the owner of the goal
    await db.run('INSERT INTO UserGoals (userId, goalId, role) VALUES (?, ?, ?)', [req.user.id, goalId, 'owner']);

    const owner: GoalMember = { id: req.user.id, goalId, userId: req.user.id, role: 'owner', status: 'active' };
    res.status(201).json({ id: goalId, title, description, isPublic, createdAt: Date.now(), members: [owner], tasks: [], rewards: [], teams: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

/**
 * @route GET /goals
 * @description Get all goals
 * @response {array} goals - List of all goals
 */
app.get('/goals', authenticate, async (req: Request, res: Response<Goal[] | { error: string }>) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = await dbPromise;
    const goals = await db.all(
      `SELECT g.* FROM Goals g
       INNER JOIN UserGoals ug ON g.id = ug.goalId
       WHERE ug.userId = ?`,
      [req.user.id]
    );

    const populatedGoals = await Promise.all(goals.map(async (goal) => {
      const tasks = await db.all('SELECT * FROM Tasks WHERE goalId = ?', [goal.id]);
      const rewards = await db.all('SELECT * FROM Rewards WHERE goalId = ?', [goal.id]);
      const members = await db.all(
        `SELECT u.id, u.name, ug.role FROM Users u
         INNER JOIN UserGoals ug ON u.id = ug.userId
         WHERE ug.goalId = ?`,
        [goal.id]
      );
      const teams = await db.all(
        `SELECT t.id, t.name FROM Teams t
         INNER JOIN TeamGoals tg ON t.id = tg.teamId
         WHERE tg.goalId = ?`,
        [goal.id]
      );

      return { ...goal, tasks, rewards, members, teams };
    }));

    res.json(populatedGoals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});