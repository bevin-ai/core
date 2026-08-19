import app from './src/app';
const port: number = 3000


app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`)
})

