import express from 'express';
import {
  getScheduleByDate,
  createOrUpdateSchedule,
  addTask,
  updateTask,
  deleteTask,
  getSchedulesByRange,
  toggleTaskCompletion
} from '../controllers/schedule.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getSchedulesByRange);
router.get('/:date', getScheduleByDate);
router.post('/', createOrUpdateSchedule);
router.post('/:date/tasks', addTask);
router.put('/:date/tasks/:taskId', updateTask);
router.delete('/:date/tasks/:taskId', deleteTask);
router.patch('/:date/tasks/:taskId/toggle', toggleTaskCompletion);

export default router;
