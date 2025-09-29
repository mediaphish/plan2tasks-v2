// Google Tasks API helper for feedback checking
export class GoogleTasksFeedback {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = 'https://www.googleapis.com/tasks/v1';
  }

  async getTaskLists() {
    try {
      const response = await fetch(`${this.baseUrl}/users/@me/lists`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Google Tasks API error: ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching task lists:', error);
      throw error;
    }
  }

  async getTasks(taskListId) {
    try {
      const response = await fetch(`${this.baseUrl}/lists/${taskListId}/tasks`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Google Tasks API error: ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  async getAllTasks() {
    try {
      const taskLists = await this.getTaskLists();
      const allTasks = [];

      for (const taskList of taskLists) {
        const tasks = await this.getTasks(taskList.id);
        allTasks.push(...tasks.map(task => ({
          ...task,
          taskListId: taskList.id,
          taskListTitle: taskList.title
        })));
      }

      return allTasks;
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      throw error;
    }
  }

  // Check if a specific task exists and get its status
  async findTaskByTitle(taskTitle) {
    try {
      const allTasks = await this.getAllTasks();
      
      // Look for tasks that match the title (case-insensitive)
      const matchingTasks = allTasks.filter(task => 
        task.title && task.title.toLowerCase().includes(taskTitle.toLowerCase())
      );

      return matchingTasks;
    } catch (error) {
      console.error('Error finding task by title:', error);
      throw error;
    }
  }

  // Check task completion status
  async checkTaskCompletion(taskTitle) {
    try {
      const matchingTasks = await this.findTaskByTitle(taskTitle);
      
      if (matchingTasks.length === 0) {
        return {
          found: false,
          completed: false,
          status: 'not_found'
        };
      }

      // Check if any matching task is completed
      const completedTasks = matchingTasks.filter(task => task.status === 'completed');
      
      return {
        found: true,
        completed: completedTasks.length > 0,
        status: completedTasks.length > 0 ? 'completed' : 'pending',
        tasks: matchingTasks,
        completedTasks: completedTasks
      };
    } catch (error) {
      console.error('Error checking task completion:', error);
      throw error;
    }
  }

  // Refresh access token if needed
  async refreshToken(refreshToken, clientId, clientSecret) {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }
}
