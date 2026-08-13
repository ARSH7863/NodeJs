# DevTinder APIs

- POST /signup
- POST /login
- POST /logout

## profileRouter
- GET /profile/view
- PATCH /profile/edit
- PATCH /profile/password // Forgot password API

## connectionRequestRouter
- POST /request/send/interested/:userId
- POST /request/send/ignored/:userId

- POST /request/review/accepted/:userId
- POST /request/review/rejected/:userId

- POST /request/send/:status/:userId
- POST /request/review/:status/:userId

## userRouter
- GET /user/connections
- GET /user/requests/received
- GET /requests/recieved

Status: ignored, interested, accepted, rejected

Read this article - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/