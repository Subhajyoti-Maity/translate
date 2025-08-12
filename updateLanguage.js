 import { connectToDatabase } from '@lib/mongodb';
 import User from '@lib/models/User';
 
 export default async function handler(req, res) {
  if (req.method === 'PUT') {
    const { userId, language } = req.body;

    try {
      await connectToDatabase();

      // Find the user by ID and update the language
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { language: language },
        { new: true } // Return the updated document
      );

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({ message: 'Language updated successfully', user: updatedUser });
    } catch (error) {
      console.error('Language update error:', error);
      res.status(500).json({ message: 'An unexpected error occurred.' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}