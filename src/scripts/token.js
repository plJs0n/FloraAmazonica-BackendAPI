import 'dotenv/config';
import { JwtService } from '@nestjs/jwt';

console.log(process.env.JWT_SECRET);

const jwtService = new JwtService({
  secret: process.env.JWT_SECRET,
});

const payload = {
  sub: 'e5dd1004-1fd3-4e5b-8fb4-37ee2b7f56cd',
  email: '2225215@unapiquitos.edu.pe',
  role: 'administrador',
};

console.log(jwtService.sign(payload));