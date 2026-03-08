# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'fa/version'

Gem::Specification.new do |spec|
  spec.name          = "fa"
  spec.version       = Fa::VERSION
  spec.authors       = ["David Lutterkort\n"]
  spec.email         = ["lutter@watzmann.net"]
  spec.licenses      = ["MIT"]

  spec.summary       = %q{Bindings for libfa, a library for computing with regular expressions.}
  spec.description   = <<EOS
Bindings for libfa, a library to manipulate finite automata. Automata are
constructed from regular expressions, using extended POSIX syntax, and make
it possible to compute interesting things like the intersection of two
regular expressions (all strings matched by both), or the complement of a
regular expression (all strings _not_ matched by the regular
expression). It is possible to convert from regular expression (compile) to
finite automaton, and from finite automaton to regular expression
(as_regexp)
EOS
  spec.homepage      = "https://github.com/lutter/ruby-fa"

  spec.files         = `git ls-files -z`.split("\x0").reject do |f|
    f.match(%r{^(test|spec|features)/})
  end
  spec.bindir        = "exe"
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  spec.add_dependency "ffi"

  spec.add_development_dependency "bundler", "~> 1.14"
  spec.add_development_dependency "rake", "~> 10.0"
  spec.add_development_dependency "minitest", "~> 5.0"
  spec.add_development_dependency "yard"
end
