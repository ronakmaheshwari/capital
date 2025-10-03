// Transaction routes
/**
 * 
 * | **Module** | **API Endpoint** | **Method** | **Role** | **Description** |
|  | `/transactions/initiate` | POST | User | Start a new transaction |
|  | `/transactions/confirm/:txnId` | POST | User/System | Confirm successful transaction |
|  | `/transactions/fail/:txnId` | POST | User/System | Mark transaction failed |
|  | `/transactions/my` | GET | User | Get my transactions |
|  | `/transactions` | GET | Admin | Get all transactions |
|  | `/transactions/:txnId` | GET | User/Admin | Get transaction details |
 */
