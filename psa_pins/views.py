from flask import render_template, g
import sqlite3
import json

from psa_pins import app

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(app.config['delphi'])
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

@app.route('/')
def index():
    vehicle = 'LM' if 'lem.db' in app.config['delphi'] else 'CM'
    return render_template('pin_inspector.html', vehicle=vehicle)

@app.route('/pins/pin/<pin>')
def get_pin_info(pin):
    c = get_db().cursor()
    res = c.execute('SELECT IOTYPE, NET, NAME FROM PINS WHERE PIN=?', (pin,))
    try:
        iotype, net, name = res.fetchone()
    except:
        return '???'

    pin_data = {}
    pin_data['name'] = name
    pin_data['iotype'] = iotype
    pin_data['wires'] = []

    if net is not None:
        for pin1, pin2 in c.execute('SELECT PIN1, PIN2 FROM WIRES WHERE NET=?', (net,)):
            pin_data['wires'].append([pin1, pin2])

    return json.dumps(pin_data)

@app.route('/pins/pin_classes')
def get_pin_classes():
    c = get_db().cursor()

    pin_classes = {}
    pin_classes['pin_classes'] = []
    for pin, iotype, name in c.execute('SELECT PIN, IOTYPE, NAME FROM PINS'):
        if iotype == 'UNK':
            pin_class = "UNK"
        elif iotype in ['NC', 'SPARE', 'BP']:
            pin_class = iotype
        elif name in ['STRUCTURE GROUND', '0 VDC IMU']:
            pin_class = 'GND'
        elif '+28' in name:
            pin_class = '+28V'
        elif '-28' in name:
            pin_class = '-28V'
        else:
            pin_class = 'DATA'

        pin_classes['pin_classes'].append({'pin': pin, 'pin_class': pin_class})

    return json.dumps(pin_classes)

@app.route('/pins/net/<path:net>')
def get_net_pins(net):
    c = get_db().cursor()

    net_data = {
        'wires': [],
    }

    for pin1, pin2 in c.execute('SELECT PIN1, PIN2 FROM WIRES WHERE NAME=?', (net,)):
        net_data['wires'].append([pin1, pin2])

    return json.dumps(net_data)

