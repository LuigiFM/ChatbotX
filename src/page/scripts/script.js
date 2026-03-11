import { v4 as uuidv4 } from './node_modules/uuid/dist/index.js';

const loginButton = document.getElementById("loginButton");
const ApiUrl = `${location.origin}/api/Usuarios`;

loginButton.addEventListener("click", () => 
{
    let userExists;

    const user = 
    {
        Usuario: document.getElementById("userInput").value,
        Senha: document.getElementById("passInput").value
    }
    let response =
    {
        status: 0,
        json: ""
    };

    fetch(ApiUrl, {
        method: 'POST',
        body: JSON.stringify(user),
        headers: {'Content-type': 'application/json'}
    })
    .then(async res => 
    {
        let data = await res.json();
        await loginUser(data, res.status == 200);
        if(res.status == 200) console.log("logou porra")
        return data;
    }
    )
    .then(data => 
    {
        response.json = data;
    }
    )


})

const loginUser = (userId, exist) => 
{

    if(!exist) 
    {
        const errormsg = document.getElementById("errormsg")
        console.log("num existe")
        errormsg.innerText = "Esse usuário não existe."
        return;
    };

    var url = location.origin
    location.replace(`${url}/src/page/html/dashboard.html`)
}