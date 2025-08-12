 import { connectToDatabase } from '@lib/mongodb';
 import User from '@lib/models/User';
 import mongoose from 'mongoose';
 
 export default async function handler(req, res) {
   if (req.method === 'GET') {
     const { username } = req.query;
 
     if (!username) {
       return res.status(400).json({ message: 'Username query parameter is required' });
     }
 
     try {
       await connectToDatabase();
 
       // Case-insensitive search for users whose username contains the query
       const users = await User.find({
         username: { $regex: username, $options: 'i' }
       }).select('_id username').lean(); // Exclude password and convert to plain JavaScript objects
 
       res.status(200).json(users);
     } catch (error) {
       console.error('Search error:', error);
       res.status(500).json({ message: 'An unexpected error occurred.' });
     }
   } else {
     res.status(405).json({ message: 'Method Not Allowed' });
   }
 }