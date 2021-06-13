const express = require('express');
const Path = require('path');
const fs = require('fs');
const {PythonShell} = require('python-shell');
const Ansible = require('node-ansible');

/* EXPRESS APP */
const app = express();
app.use(express.urlencoded({extended: false}));
app.use(express.json());

/* FILES */
const varsFile = Path.join(__dirname, 'files', 'vars.json');
const scriptFile = Path.join(__dirname, 'scripts', 'parse.py');
const createMVPlaybook = Path.join(__dirname, 'ansible', 'create_mv');
const removeMVPlaybook = Path.join(__dirname, 'ansible', 'remove_mv');
const playbookLogSuccess = Path.join(
    __dirname,
    '..',
    'logs',
    'ansible_success'
);
const playbookLogError = Path.join(
    __dirname,
    '..',
    'logs',
    'ansible_error'
);
// const getInventoryPlaybook = Path.join(__dirname, '..', 'ansible', 'get_inventory');

/* FUNCTIONS */
const createVarsFile = (file, vars) => {
    fs.writeFile(file, vars, (error) => {
        if (error) throw error;
        console.log(`Data saved on: ${file}\n`);
    });

    const pyScript = new PythonShell(scriptFile);

    pyScript.end((error) => {
        if (error) throw error;

        console.log('Python script ended');
    });
};

const execPlaybook = (playbookFile) => {
    const playbook = new Ansible.Playbook().playbook(playbookFile);
    playbook.on('stdout', function(data) { console.log(data.toString()); });
    playbook.on('stderr', function(data) { console.log(data.toString()); });
    const promise = playbook.exec();

    promise.then(
        (successResult) => {
            console.log(
                `Successful playbook execution with exit code: ${successResult.code}`,
            );

            // Successful log file
            const date = new Date();
            console.log(playbookLogSuccess);
            console.log(successResult.output);

            fs.appendFile(
                playbookLogSuccess,
                `${date}\n${successResult.output}`,
                (errorFile) => {
                    if (errorFile) throw errorFile;

                    console.log(
                        `Successful log file creation on:  ${playbookLogSuccess}\n`
                    );
                },
            );
        },
        (error) => {
            console.log(`Failed playbook execution with code: ${error}\n`);

            // Failed log archive
            const playbookLogError = Path.join(
                __dirname,
                '..',
                'logs',
                'ansible_error'
            );
            const date = new Date();

            fs.appendFile(playbookLogError, `${date}\n${error}`, (errorFile) => {
                if (errorFile) throw errorFile;

                console.log(`Failed log file creation on: ${playbookLogError}\n`);
            });
        },
    );
};

/* ENDPOINTS */
app.post('/creation', (req, res) => {
    console.log(`Request body: ${JSON.stringify(req.body)}`);

    createVarsFile(varsFile, JSON.stringify(req.body));
    execPlaybook(createMVPlaybook);

    res.send('POST /creation');
})

app.post('/removal', (req, res) => {
    console.log(`Request body: ${JSON.stringify(req.body)}`);

    createVarsFile(varsFile, JSON.stringify(req.body));
    execPlaybook(removeMVPlaybook);

    res.send('POST /removal');
});

// app.get("/test", (req, res) => {});

/* API */
// const port = process.env.NODE_ENV === "" ? process.env.PORT || 80 : 3000;
const port = 3000;
const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});